export const TANGGAPI_OPEN_EVENT = "aceh:open-tanggapi";
export const TANGGAPI_OPEN_STORAGE = "aceh:open-tanggapi";
export const TANGGAPI_BUBBLE_STORAGE = "aceh:tanggapi-bubble-seen";

function writeOpenFlag() {
  try {
    sessionStorage.setItem(TANGGAPI_OPEN_STORAGE, "1");
  } catch {
    // Private mode or storage blocked — event still fires for a mounted listener.
  }
}

export function requestOpenTanggapi(): void {
  if (typeof window === "undefined") return;
  writeOpenFlag();
  window.dispatchEvent(new CustomEvent(TANGGAPI_OPEN_EVENT));
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
