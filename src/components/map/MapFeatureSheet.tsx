"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  SHEET_HEADER_PX,
  attributionLift,
  nearestSheetSnap,
  attributionCreditParts,
  sheetFrame,
  sheetScrollTarget,
  sheetWheelStep,
  type SheetSnap,
} from "@/lib/map-sheet";

function readSafeAreaBottom(): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--map-safe-area-bottom")
    .trim();
  const fromVar = Number.parseFloat(raw);
  if (Number.isFinite(fromVar)) return fromVar;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;height:env(safe-area-inset-bottom, 0px);";
  document.body.appendChild(probe);
  const height = probe.getBoundingClientRect().height;
  probe.remove();
  return height;
}

/** A drag must not leave focus on the sheet header or the SIK Aceh logo. */
function releaseSheetDragFocus(header: HTMLElement) {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;
  const onHeader = header.contains(active);
  const label = active.getAttribute("aria-label") ?? "";
  const onLogo = active.closest("[data-sitenav]") != null && label.includes("SIK Aceh");
  if (!onHeader && !onLogo) return;
  active.blur();
}

/** Phone sheet. Docks to the bottom edge. Safe area is padding inside. */
export function MapFeatureSheet({
  title,
  onClose,
  onSnap,
  creditHtml = "",
  children,
}: {
  title: string;
  onClose: () => void;
  onSnap?: (snap: SheetSnap, height: number) => void;
  /** Attribution HTML from the active basemap style sources. */
  creditHtml?: string;
  children: ReactNode;
}) {
  const t = useTranslations("map");
  const [snap, setSnap] = useState<SheetSnap>("default");
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [safeArea, setSafeArea] = useState(0);
  const [contentHeight, setContentHeight] = useState(SHEET_HEADER_PX);
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{ y: number; height: number } | null>(null);
  const onSnapRef = useRef(onSnap);
  onSnapRef.current = onSnap;

  const frame = sheetFrame(
    typeof window === "undefined" ? 844 : window.innerHeight,
    safeArea,
    contentHeight,
  );
  const frameRef = useRef(frame);
  frameRef.current = frame;

  useLayoutEffect(() => {
    const measure = () => {
      setSafeArea(readSafeAreaBottom());
      const body = bodyRef.current;
      const inner = body?.firstElementChild;
      const innerHeight = inner instanceof HTMLElement ? inner.offsetHeight : 0;
      setContentHeight(SHEET_HEADER_PX + innerHeight + readSafeAreaBottom());
    };
    measure();
    const obs = new ResizeObserver(measure);
    if (bodyRef.current) obs.observe(bodyRef.current);
    window.addEventListener("resize", measure);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [title, children]);

  const height = dragHeight ?? frame[snap];
  const heightRef = useRef(height);
  heightRef.current = height;

  const settledHeight = snap === "full" ? frame.full : frame.default;
  useEffect(() => {
    if (dragHeight != null) return;
    onSnapRef.current?.(snap, settledHeight);
  }, [snap, settledHeight, dragHeight]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useLayoutEffect(() => {
    const stage = rootRef.current?.closest(".map-stage");
    if (!(stage instanceof HTMLElement) || !rootRef.current) return;
    stage.setAttribute("data-sheet-snap", snap);
    if (snap !== "default") {
      stage.style.removeProperty("--map-attrib-lift");
      return;
    }
    const map = stage.querySelector(".maplibregl-map");
    if (!(map instanceof HTMLElement)) return;
    const lift = attributionLift({
      mapBottom: map.getBoundingClientRect().bottom,
      sheetTop: rootRef.current.getBoundingClientRect().top,
    });
    stage.style.setProperty("--map-attrib-lift", `${lift}px`);
  }, [snap, height]);

  useEffect(() => {
    return () => {
      const stage = document.querySelector(".map-stage");
      if (!(stage instanceof HTMLElement)) return;
      stage.removeAttribute("data-sheet-snap");
      stage.style.removeProperty("--map-attrib-lift");
    };
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    // Window capture runs before React's root listener and before MapLibre's
    // canvas listener. MapLibre calls preventDefault on the canvas container
    // only, so a wheel whose target is the sheet never reaches it — unless a
    // descendant stops the event first. Handle it here, on the real scroller.
    // Line mode is ~16px per line. Page mode is the sheet height.
    // Sub-pixel trackpad momentum is kept in `remainder`.
    let remainder = 0;
    let idle = 0;
    const stop = (event: WheelEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || !el.contains(target)) return;
      const scroller = sheetScrollTarget(el, target);
      for (const node of Array.from(el.querySelectorAll("[data-sheet-scroller]"))) {
        node.removeAttribute("data-sheet-scroller");
      }
      scroller.setAttribute("data-sheet-scroller", "true");
      event.preventDefault();
      event.stopPropagation();
      const pageHeight = el.clientHeight;
      const step = sheetWheelStep({
        scrollTop: scroller.scrollTop,
        scrollHeight: scroller.scrollHeight,
        clientHeight: scroller.clientHeight,
        pageHeight,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        remainder,
      });
      remainder = step.remainder;
      scroller.scrollTop = step.scrollTop;
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        remainder = 0;
      }, 120);
    };
    window.addEventListener("wheel", stop, { capture: true, passive: false });
    return () => {
      window.clearTimeout(idle);
      window.removeEventListener("wheel", stop, { capture: true });
    };
  }, []);

  useEffect(() => {
    const header = rootRef.current?.querySelector("[data-sheet-header]");
    if (!(header instanceof HTMLElement)) return;
    const blockFocus = (event: Event) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("[data-sheet-close]")
      ) {
        return;
      }
      event.preventDefault();
    };
    const release = () => {
      releaseSheetDragFocus(header);
      requestAnimationFrame(() => releaseSheetDragFocus(header));
    };
    header.addEventListener("pointerdown", blockFocus, true);
    header.addEventListener("mousedown", blockFocus, true);
    header.addEventListener("pointerup", release);
    return () => {
      header.removeEventListener("pointerdown", blockFocus, true);
      header.removeEventListener("mousedown", blockFocus, true);
      header.removeEventListener("pointerup", release);
    };
  }, []);

  const footerCredit = snap === "full" ? attributionCreditParts(creditHtml) : [];

  return (
    <div
      ref={rootRef}
      data-map-sheet
      data-sheet-snap={snap}
      className="map-feature-sheet pointer-events-auto fixed inset-x-0 z-30 flex flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--map-chrome)] text-[var(--text)] shadow-[var(--shadow-elevated)]"
      style={{
        bottom: 0,
        height,
        paddingBottom: frame.safeAreaBottom,
      }}
    >
      <div
        data-sheet-handle
        data-sheet-header
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={snap === "default" ? 0 : 1}
        aria-label={t("sheetHandle")}
        className="relative flex shrink-0 cursor-grab touch-none select-none items-center gap-2 px-3 pt-3"
        style={{ height: SHEET_HEADER_PX }}
        onMouseDown={(event) => {
          if ((event.target as HTMLElement).closest("[data-sheet-close]")) return;
          event.preventDefault();
        }}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("[data-sheet-close]")) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          dragOrigin.current = { y: event.clientY, height };
        }}
        onPointerMove={(event) => {
          const origin = dragOrigin.current;
          if (!origin) return;
          const next = origin.height - (event.clientY - origin.y);
          const clamped = Math.max(48, Math.min(frameRef.current.full, next));
          heightRef.current = clamped;
          setDragHeight(clamped);
        }}
        onPointerUp={(event) => {
          const origin = dragOrigin.current;
          dragOrigin.current = null;
          releaseSheetDragFocus(event.currentTarget);
          if (!origin) return;
          const current = heightRef.current;
          setDragHeight(null);
          const next = nearestSheetSnap(current, frameRef.current);
          if (next === "closed") onClose();
          else setSnap(next);
        }}
        onPointerCancel={() => {
          dragOrigin.current = null;
          setDragHeight(null);
        }}
      >
        <span
          aria-hidden
          data-sheet-grip
          className="absolute left-1/2 top-2 h-1.5 w-10 -translate-x-1/2 select-none rounded-full bg-[var(--border)]"
        />
        <div className="min-w-0 flex-1">
          <h2 data-sheet-title className="truncate text-[1.05rem] font-semibold leading-snug">
            {title}
          </h2>
        </div>
        <button
          type="button"
          data-sheet-close
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--text-dim)] hover:bg-[var(--bg-muted)]"
          onClick={onClose}
          aria-label={t("cardClose")}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div
        ref={bodyRef}
        data-sheet-body
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        onWheel={(event) => event.stopPropagation()}
        onWheelCapture={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        {children}
      </div>
      {footerCredit.length > 0 ? (
        <p
          data-sheet-credit
          className="shrink-0 px-3 pb-3 pt-1 text-[0.8125rem] leading-snug text-[var(--text-dim)]"
        >
          {footerCredit.map((item, index) =>
            item.href ? (
              <a
                key={`${item.href}-${index}`}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {item.label}
              </a>
            ) : (
              <span key={`text-${index}`}>{item.label}</span>
            ),
          )}
        </p>
      ) : null}
    </div>
  );
}
