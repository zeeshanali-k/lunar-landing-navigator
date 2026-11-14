/** Typed REST HTTP client with AbortController cancellation and offline fixture fallback (F3.2). */

const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};

export const API_BASE_URL = metaEnv.VITE_API_BASE_URL ?? "/api/v1";
export const FORCE_OFFLINE_FALLBACK = metaEnv.VITE_OFFLINE_FALLBACK === "true";

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

export interface RequestJsonOptions<TResponse> {
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  requestKey?: string;
  signal?: AbortSignal;
  fallbackFixture: string;
  transformFallback?: (fixtureData: TResponse) => TResponse;
}

async function loadFallbackFixture<TResponse>(
  fixtureName: string,
  signal: AbortSignal,
  transformFallback?: (fixtureData: TResponse) => TResponse,
): Promise<TResponse> {
  const response = await fetch(`/data/fixtures/${fixtureName}`, { signal });
  if (!response.ok) {
    throw new Error(`Fallback fixture "${fixtureName}" failed with status ${response.status}.`);
  }
  const fixtureData = (await response.json()) as TResponse;
  setOfflineStatus(true);
  return transformFallback ? transformFallback(fixtureData) : fixtureData;
}

/**
 * Perform a typed JSON API request, cancelling older requests sharing `requestKey`
 * and falling back to `/data/fixtures/{fallbackFixture}` if the backend is offline.
 */
export async function requestJson<TResponse>(
  options: RequestJsonOptions<TResponse>,
): Promise<TResponse> {
  const { path, method = "GET", body, requestKey, signal, fallbackFixture, transformFallback } =
    options;

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
      return await loadFallbackFixture(fallbackFixture, controller.signal, transformFallback);
    }

    const headers: Record<string, string> | undefined =
      body !== undefined ? { "Content-Type": "application/json" } : undefined;

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      return await loadFallbackFixture(fallbackFixture, controller.signal, transformFallback);
    }

    const data = (await response.json()) as TResponse;
    setOfflineStatus(false);
    return data;
  } catch (error: unknown) {
    if (isAbortError(error) || controller.signal.aborted) {
      throw error;
    }
    return await loadFallbackFixture(fallbackFixture, controller.signal, transformFallback);
  } finally {
    signal?.removeEventListener("abort", onExternalAbort);
    if (requestKey && pendingControllers.get(requestKey) === controller) {
      pendingControllers.delete(requestKey);
    }
  }
}
