export const TANGGAPI_OPEN_EVENT = "aceh:open-tanggapi";
export const TANGGAPI_OPEN_STORAGE = "aceh:open-tanggapi";
export const TANGGAPI_BUBBLE_STORAGE = "aceh:tanggapi-bubble-seen";
/** Optional location seed for CTA opens. Documented in FE-37. Not a backend API. */
export const TANGGAPI_SEED_STORAGE = "aceh:tanggapi-seed";

function writeOpenFlag() {
  try {
    sessionStorage.setItem(TANGGAPI_OPEN_STORAGE, "1");
  } catch {
    // Private mode or storage blocked — event still fires for a mounted listener.
  }
}

function writeSeed(seed?: string) {
  try {
    const text = seed?.trim() ?? "";
    if (text) sessionStorage.setItem(TANGGAPI_SEED_STORAGE, text);
    else sessionStorage.removeItem(TANGGAPI_SEED_STORAGE);
  } catch {
    // Private mode — panel still opens without a seed.
  }
}

export function requestOpenTanggapi(seed?: string): void {
  if (typeof window === "undefined") return;
  writeOpenFlag();
  writeSeed(seed);
  window.dispatchEvent(new CustomEvent(TANGGAPI_OPEN_EVENT));
}

export function consumeTanggapiSeed(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const seed = sessionStorage.getItem(TANGGAPI_SEED_STORAGE);
    sessionStorage.removeItem(TANGGAPI_SEED_STORAGE);
    return seed?.trim() || null;
  } catch {
    return null;
  }
}

export function consumeOpenTanggapi(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(TANGGAPI_OPEN_STORAGE) !== "1") return false;
    sessionStorage.removeItem(TANGGAPI_OPEN_STORAGE);
    return true;
  } catch {
    return false;
  }
}

/** True when the first-visit FAB bubble should stay hidden this session. */
export function hasSeenTanggapiBubble(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(TANGGAPI_BUBBLE_STORAGE) === "1";
  } catch {
    return true;
  }
}

export function markTanggapiBubbleSeen(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(TANGGAPI_BUBBLE_STORAGE, "1");
  } catch {
    // Private mode — skip the bubble rather than repeat it.
  }
}
