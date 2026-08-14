import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

const ATTEMPT_TIMEOUT_MS = 1_500;
const MAX_ATTEMPTS = 3;

// Docker-host gateway (the front-public container reaches the host's dev apps
// through this IP). Override via REACHABILITY_HOST_IP if the network differs.
const HOST_IP = process.env.REACHABILITY_HOST_IP || "172.17.0.1";

function isLoopbackHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "[::1]" ||
    h === "127.0.0.1" ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)
  );
}

// Dev apps run on the Docker host (e.g. E-Card at http://localhost:7300). Inside
// this container "localhost" is the container itself, so rewrite loopback
// hostnames to the host gateway before probing — this mirrors what the user's
// browser would see when the app runs on their machine.
function toHostReachable(url: string): string {
  try {
    const u = new URL(url);
    if (isLoopbackHostname(u.hostname)) {
      u.hostname = HOST_IP;
    }
    return u.toString();
  } catch {
    return url;
  }
}

async function probeOnce(target: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
  try {
    const r = await fetch(target, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
    if (r.status >= 200 && r.status < 500) {
      return true;
    }
    if (r.status >= 500) {
      return false;
    }
  } catch {
    /* try GET */
  }
  if (controller.signal.aborted) {
    return false;
  }
  try {
    const r2 = await fetch(target, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
    return r2.status >= 200 && r2.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Server-side reachability probe. The browser asks this same-origin endpoint
 * ("is <url> up?") and the server performs the check from its own network, where
 * browser network policy (Private Network Access / mixed content — which blocks
 * pages on a public HTTPS site from fetching the user's localhost) cannot
 * interfere. Only returns ok:true|false — no content is proxied.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return json({ ok: false, reason: "missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return json({ ok: false, reason: "invalid url" }, { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return json({ ok: false, reason: "unsupported protocol" }, { status: 400 });
  }

  const target = toHostReachable(parsed.toString());
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (await probeOnce(target)) {
      return json({ ok: true });
    }
  }
  return json({ ok: false });
}
