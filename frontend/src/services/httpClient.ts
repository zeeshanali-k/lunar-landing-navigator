/** Typed REST HTTP client with AbortController cancellation and offline fixture fallback (F3.2).
 *
 * Fallback rules (REQ-10):
 *   1. Trigger only on a network failure or a 5xx response. A 4xx is a contract
 *      error and is always surfaced to the caller.
 *   2. Apply only when the fixture manifest carries an exact key match for the
 *      requested scenario. There is no relabelling of a fixture to look like a
 *      different site or date.
 *   3. Show a persistent offline badge for as long as fixture data is displayed.
 *   4. An unmatched scenario raises `OFFLINE_FIXTURE_UNAVAILABLE`.
 */

const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export const API_BASE_URL = metaEnv.VITE_API_BASE_URL ?? "/api/v1";
export const FORCE_OFFLINE_FALLBACK = metaEnv.VITE_OFFLINE_FALLBACK === "true";

/** Raised when an offline scenario has no exact-match fixture. */
export const OFFLINE_FIXTURE_UNAVAILABLE = "OFFLINE_FIXTURE_UNAVAILABLE";

type OfflineListener = (isOffline: boolean) => void;

let offlineFallbackActive = FORCE_OFFLINE_FALLBACK;
const offlineListeners = new Set<OfflineListener>();
const pendingControllers = new Map<string, AbortController>();

function setOfflineStatus(next: boolean): void {
  if (offlineFallbackActive === next) {
    return;
  }
  offlineFallbackActive = next;
  offlineListeners.forEach((listener) => listener(next));
}

/** Return true if the client is currently serving static offline fixtures. */
export function isOfflineFallbackActive(): boolean {
  return offlineFallbackActive;
}

/** Subscribe to changes in live-vs-offline fallback status. Returns an unsubscribe function. */
export function subscribeOfflineStatus(listener: OfflineListener): () => void {
  offlineListeners.add(listener);
  return () => {
    offlineListeners.delete(listener);
  };
}

/** Cancel any in-flight request registered under the given request key. */
export function cancelPendingRequest(requestKey: string): void {
  const existing = pendingControllers.get(requestKey);
  if (existing) {
    existing.abort();
    pendingControllers.delete(requestKey);
  }
}

/** Type-guard for DOMException / Fetch AbortError rejections. */
export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: unknown }).name === "AbortError"
  );
}

/** A generated fixture-manifest entry. Keys are canonical scenario keys (REQ-11). */
interface FixtureManifest {
  [scenarioKey: string]: { file: string };
}

let manifestCache: FixtureManifest | null = null;
let manifestFailed = false;

async function loadManifest(signal: AbortSignal): Promise<FixtureManifest | null> {
  if (manifestCache) {
    return manifestCache;
  }
  if (manifestFailed) {
    return null;
  }
  try {
    const response = await fetch("/data/fixtures/manifest.json", { signal });
    if (!response.ok) {
      manifestFailed = true;
      return null;
    }
    manifestCache = (await response.json()) as FixtureManifest;
    return manifestCache;
  } catch {
    manifestFailed = true;
    return null;
  }
}

/**
 * Load a fixture for an exact scenario key. A missing manifest entry is an error,
 * never a substitution: the caller must know that no data is available.
 */
async function loadFallbackFixture(
  scenarioKey: string | undefined,
  signal: AbortSignal,
): Promise<unknown> {
  if (!scenarioKey) {
    throw new Error(`${OFFLINE_FIXTURE_UNAVAILABLE}: no scenario key supplied.`);
  }
  const manifest = await loadManifest(signal);
  const entry = manifest?.[scenarioKey];
  if (!entry) {
    throw new Error(`${OFFLINE_FIXTURE_UNAVAILABLE}: no fixture for scenario "${scenarioKey}".`);
  }
  const response = await fetch(`/data/fixtures/${entry.file}`, { signal });
  if (!response.ok) {
    throw new Error(`${OFFLINE_FIXTURE_UNAVAILABLE}: fixture "${entry.file}" is unreadable.`);
  }
  setOfflineStatus(true);
  return await response.json();
}

export interface RequestJsonOptions {
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  requestKey?: string;
  signal?: AbortSignal;
  /** Canonical scenario key; must match a fixture-manifest entry exactly. */
  scenarioKey?: string;
}

/**
 * Perform a typed JSON API request, cancelling older requests sharing `requestKey`.
 * Falls back to an exact-match fixture only on network failure or 5xx.
 */
export async function requestJson<TResponse>(
  options: RequestJsonOptions,
): Promise<TResponse> {
  const { path, method = "GET", body, requestKey, signal, scenarioKey } = options;

  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }
  if (requestKey) {
    cancelPendingRequest(requestKey);
  }

  const controller = new AbortController();
  if (requestKey) {
    pendingControllers.set(requestKey, controller);
  }

  const onExternalAbort = (): void => controller.abort();
  signal?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    if (FORCE_OFFLINE_FALLBACK) {
      return (await loadFallbackFixture(scenarioKey, controller.signal)) as TResponse;
    }

    const headers: Record<string, string> | undefined =
      body !== undefined ? { "Content-Type": "application/json" } : undefined;

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (response.status >= 500) {
      return (await loadFallbackFixture(scenarioKey, controller.signal)) as TResponse;
    }

    if (!response.ok) {
      // A 4xx is a contract error: surface it, never mask it with fixture data.
      const detail = await response.text().catch(() => "");
      throw new Error(`API ${response.status} for ${path}${detail ? `: ${detail}` : ""}`);
    }

    const data = (await response.json()) as TResponse;
    setOfflineStatus(false);
    return data;
  } catch (error: unknown) {
    if (isAbortError(error) || controller.signal.aborted) {
      throw error;
    }
    // A network failure is the only remaining fallback trigger.
    if (error instanceof TypeError) {
      return (await loadFallbackFixture(scenarioKey, controller.signal)) as TResponse;
    }
    throw error;
  } finally {
    signal?.removeEventListener("abort", onExternalAbort);
    if (requestKey && pendingControllers.get(requestKey) === controller) {
      pendingControllers.delete(requestKey);
    }
  }
}
