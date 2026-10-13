"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  SHEET_HEADER_PX,
  nearestSheetSnap,
  sheetFrame,
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

/** Phone sheet. Docks to the bottom edge. Safe area is padding inside. */
export function MapFeatureSheet({
  title,
  onClose,
  onSnap,
  children,
}: {
  title: string;
  onClose: () => void;
  onSnap?: (snap: SheetSnap, height: number) => void;
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

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const stop = (event: WheelEvent) => {
      event.stopPropagation();
    };
    el.addEventListener("wheel", stop, { capture: true });
    return () => el.removeEventListener("wheel", stop, { capture: true });
  }, []);

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
        className="relative flex shrink-0 cursor-grab touch-none items-center gap-2 px-3"
        style={{ height: SHEET_HEADER_PX }}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("[data-sheet-close]")) return;
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
        onPointerUp={() => {
          const origin = dragOrigin.current;
          dragOrigin.current = null;
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
          className="absolute left-1/2 top-2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-[var(--border)]"
        />
        <h2 data-sheet-title className="min-w-0 flex-1 truncate text-[1.05rem] font-semibold leading-snug">
          {title}
        </h2>
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
    </div>
  );
}
