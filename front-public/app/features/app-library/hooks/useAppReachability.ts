import { useState, useEffect } from "react";

export type ReachabilityState = "checking" | "online" | "offline" | "unavailable";

const ATTEMPT_TIMEOUT_MS = 1_600;
const RETRY_DELAY_MS = 300;
const MAX_ATTEMPTS = 3;
const RECHECK_INTERVAL_MS = 15_000;

/**
 * Best-effort probe from the *user's browser* to the app's base URL.
 * `http://localhost:…` dev targets are checked in the browser (Docker back-end cannot see the host).
 * The probe retries a few times to absorb transient failures, then falls back to
 * a server-side probe (same-origin /app/api/reachability) that is immune to
 * browser network policy (Private Network Access / mixed content can block
 * direct browser checks of localhost from a public HTTPS page).
 */
function trimTrailingSlash(u: string) {
  return u.replace(/\/+$/, "");
}

async function probeUrl(url: string, signal: AbortSignal): Promise<boolean> {
  const base = trimTrailingSlash(url);
  try {
    const r = await fetch(base, {
      method: "HEAD",
      mode: "cors",
      cache: "no-store",
      signal,
    });
    if (r.status >= 200 && r.status < 500) {
      return true;
    }
    if (r.status >= 500) {
      return false;
    }
  } catch {
    /* try opaque GET */
  }
  if (signal.aborted) {
    return false;
  }
  try {
    const r2 = await fetch(base, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal,
    });
    if (r2.type === "opaque" || r2.type === "opaqueredirect") {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onAbort = () => {
      if (timer) {
        clearTimeout(timer);
      }
      resolve();
    };
    if (signal.aborted) {
      resolve();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
  });
}

/** Server-side fallback probe: immune to browser network policy. */
async function probeViaServer(url: string, signal: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`/app/api/reachability?url=${encodeURIComponent(url)}`, {
      cache: "no-store",
      signal,
    });
    if (!res.ok) {
      return false;
    }
    const data = (await res.json()) as { ok?: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}

/** Full check: 3 direct browser attempts, then a server-side probe. */
async function checkReachability(url: string, signal: AbortSignal): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const attemptController = new AbortController();
    const timeout = setTimeout(() => attemptController.abort(), ATTEMPT_TIMEOUT_MS);
    const forwardAbort = () => attemptController.abort();
    signal.addEventListener("abort", forwardAbort);
    let ok = false;
    try {
      ok = await probeUrl(url, attemptController.signal);
    } catch {
      ok = false;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", forwardAbort);
    }
    if (signal.aborted) {
      return false;
    }
    if (ok) {
      return true;
    }
    if (attempt < MAX_ATTEMPTS) {
      await delay(RETRY_DELAY_MS, signal);
    }
  }
  if (signal.aborted) {
    return false;
  }
  // Direct browser probe failed (target down, or the browser blocked the
  // localhost request — Chrome Private Network Access / mixed content).
  // Ask the server to probe from its own network before declaring offline.
  return probeViaServer(url, signal);
}

export function useAppReachability(url: string | undefined | null) {
  const [state, setState] = useState<ReachabilityState>("checking");

  useEffect(() => {
    if (!url || url.trim() === "") {
      setState("unavailable");
      return;
    }

    let href: URL;
    try {
      href = new URL(url);
    } catch {
      setState("unavailable");
      return;
    }

    if (href.protocol !== "http:" && href.protocol !== "https:") {
      setState("unavailable");
      return;
    }

    setState("checking");
    let cancelled = false;
    let running = false;
    const controller = new AbortController();

    const run = async () => {
      const ok = await checkReachability(href.toString(), controller.signal);
      if (!cancelled && !controller.signal.aborted) {
        setState(ok ? "online" : "offline");
      }
    };

    // Check immediately, then re-check periodically so the badge stays live
    // (e.g. Rizervox flips to Available the moment its dev server comes up).
    void (async () => {
      running = true;
      try {
        await run();
      } finally {
        running = false;
      }
    })();
    const timer = setInterval(() => {
      if (!cancelled && !running) {
        running = true;
        void run().finally(() => {
          running = false;
        });
      }
    }, RECHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      controller.abort();
    };
  }, [url]);

  return state;
}
