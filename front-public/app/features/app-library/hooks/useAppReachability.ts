import { useState, useEffect } from "react";

export type ReachabilityState = "checking" | "online" | "offline" | "unavailable";

/**
 * Best-effort probe from the *user's browser* to the app's base URL.
 * `http://localhost:…` dev targets are checked in the browser (Docker back-end cannot see the host).
 * May be blocked by CORS, mixed content, or privacy tools — in those cases the status can read offline.
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
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 5_200);

    void (async () => {
      const ok = await probeUrl(href.toString(), ac.signal);
      clearTimeout(t);
      if (ac.signal.aborted) {
        setState("offline");
        return;
      }
      setState(ok ? "online" : "offline");
    })().catch(() => {
      clearTimeout(t);
      if (!ac.signal.aborted) {
        setState("offline");
      }
    });

    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [url]);

  return state;
}
