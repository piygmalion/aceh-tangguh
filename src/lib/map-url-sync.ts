/**
 * Map query persistence that must not fight Next.js App Router navigation.
 *
 * `router.replace('/peta?…')` is itself a navigation. A pending camera write
 * (moveend debounce) or canonical-alias rewrite can abort a SiteNav Link
 * click and bounce the user back to `/[locale]/peta`.
 */

export type MapUrlPatch = Record<string, string | null>;

export type MapUrlWritePlan = {
  method: "replaceState" | "skip";
  href: string;
  search: string;
};

const MAP_PATH = /(?:^|\/)peta\/?$/;

export function isMapPathname(pathname: string): boolean {
  const path = pathname.split("?")[0].split("#")[0];
  return MAP_PATH.test(path);
}

export function applySearchParamsPatch(
  currentSearch: string,
  patch: MapUrlPatch
): URLSearchParams {
  const raw = currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch;
  const params = new URLSearchParams(raw);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
  }
  return params;
}

export function composeMapHref(
  pathname: string,
  search: string,
  hash = ""
): string {
  const qs = search.startsWith("?") ? search.slice(1) : search;
  const hashPart = !hash ? "" : hash.startsWith("#") ? hash : `#${hash}`;
  return `${pathname}${qs ? `?${qs}` : ""}${hashPart}`;
}

export function planMapUrlWrite(input: {
  currentPathname: string;
  livePathname: string;
  currentSearch: string;
  patch: MapUrlPatch;
  hash?: string;
}): MapUrlWritePlan {
  if (!isMapPathname(input.currentPathname) || !isMapPathname(input.livePathname)) {
    return { method: "skip", href: "", search: "" };
  }
  const params = applySearchParamsPatch(input.currentSearch, input.patch);
  const search = params.toString();
  return {
    method: "replaceState",
    href: composeMapHref(input.livePathname, search, input.hash ?? ""),
    search,
  };
}

export function isInternalPrimaryNavClick(event: {
  button?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  defaultPrevented?: boolean;
}): boolean {
  if (event.defaultPrevented) return false;
  if ((event.button ?? 0) !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  return true;
}

export function isOffMapHref(href: string, currentPathname: string): boolean {
  try {
    const url = new URL(href, `http://aceh.invalid${currentPathname}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return isMapPathname(currentPathname) && !isMapPathname(url.pathname);
  } catch {
    return false;
  }
}

export function shouldCancelMapUrlSyncOnClick(input: {
  href: string | null;
  currentPathname: string;
  target?: string | null;
  button?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  defaultPrevented?: boolean;
}): boolean {
  if (!input.href) return false;
  if (input.target && input.target !== "_self") return false;
  if (!isInternalPrimaryNavClick(input)) return false;
  return isOffMapHref(input.href, input.currentPathname);
}

export type MapUrlWriteInput = {
  currentPathname: string;
  currentSearch: string;
  patch: MapUrlPatch;
};

export function createMapUrlWriter(options: {
  getLivePathname: () => string;
  getHash?: () => string;
  replaceState: (href: string) => void;
  setTimeoutFn?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeoutFn?: (id: ReturnType<typeof setTimeout>) => void;
}) {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const setTimeoutFn = options.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;

  function clearTimer() {
    if (timer == null) return;
    clearTimeoutFn(timer);
    timer = null;
  }

  function cancel() {
    cancelled = true;
    clearTimer();
  }

  function write(input: MapUrlWriteInput): MapUrlWritePlan {
    if (cancelled) return { method: "skip", href: "", search: "" };
    const plan = planMapUrlWrite({
      ...input,
      livePathname: options.getLivePathname(),
      hash: options.getHash?.() ?? "",
    });
    if (plan.method === "replaceState") {
      options.replaceState(plan.href);
    }
    return plan;
  }

  function schedule(
    getInput: () => MapUrlWriteInput,
    delayMs: number,
    onWrote?: (plan: MapUrlWritePlan) => void
  ) {
    if (cancelled) {
      onWrote?.({ method: "skip", href: "", search: "" });
      return;
    }
    clearTimer();
    timer = setTimeoutFn(() => {
      timer = null;
      const plan = write(getInput());
      onWrote?.(plan);
    }, delayMs);
  }

  function bindDocumentClick(
    doc: Pick<Document, "addEventListener" | "removeEventListener">
  ): () => void {
    const onClick = (event: Event) => {
      if (!(event instanceof MouseEvent)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (
        shouldCancelMapUrlSyncOnClick({
          href: anchor.getAttribute("href"),
          currentPathname: options.getLivePathname(),
          target: anchor.getAttribute("target"),
          button: event.button,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          defaultPrevented: event.defaultPrevented,
        })
      ) {
        cancel();
      }
    };
    doc.addEventListener("click", onClick, true);
    return () => doc.removeEventListener("click", onClick, true);
  }

  return {
    write,
    schedule,
    cancel,
    isCancelled: () => cancelled,
    bindDocumentClick,
  };
}
