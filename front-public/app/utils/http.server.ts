/**
 * Fetch with retries for short-lived outages (e.g. back-auth still binding after
 * `docker compose up`, 502/503/504 from upstreams).
 */
function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.round(ms)));
}

const DEFAULT_RETRIABLE_HTTP: readonly number[] = [502, 503, 504];
const DEFAULT_MAX_ATTEMPTS = 4;
const DEFAULT_BASE_DELAY_MS = 400;

type FetchWithTransientRetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  retriableHttpStatus?: number[];
};

export async function fetchWithTransientRetry(
  url: string | URL,
  init: RequestInit = {},
  options: FetchWithTransientRetryOptions = {}
): Promise<Response> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const retriable = new Set(options.retriableHttpStatus ?? DEFAULT_RETRIABLE_HTTP);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) {
        return res;
      }
      if (retriable.has(res.status) && attempt < maxAttempts - 1) {
        await sleepMs(baseDelayMs * 1.4 ** attempt);
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < maxAttempts - 1) {
        await sleepMs(baseDelayMs * 1.4 ** attempt);
        continue;
      }
      throw err;
    }
  }

  throw new Error("fetchWithTransientRetry: exhausted without response");
}
