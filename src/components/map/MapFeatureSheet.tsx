"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { nearestSheetSnap, sheetFrame, type SheetSnap } from "@/lib/map-sheet";

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

/** Phone sheet. Sits above the layer handle so that handle stays tappable. */
export function MapFeatureSheet({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("map");
  const [snap, setSnap] = useState<SheetSnap>("half");
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [frame, setFrame] = useState(() => sheetFrame(844, 0));
  const dragOrigin = useRef<{ y: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => setFrame(sheetFrame(window.innerHeight, readSafeAreaBottom()));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const height = dragHeight ?? frame[snap];
  const heightRef = useRef(height);
  heightRef.current = height;

  return (
    <div
      data-map-sheet
      data-sheet-snap={snap}
      className="map-feature-sheet pointer-events-auto fixed z-40 flex flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--map-chrome)] text-[var(--text)] shadow-[var(--shadow-elevated)]"
      style={{
        left: 8,
        right: 8,
        bottom: frame.bottom,
        height,
      }}
    >
      <div
        data-sheet-handle
        role="slider"
        tabIndex={0}
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={snap === "peek" ? 0 : snap === "half" ? 1 : 2}
        aria-label={t("sheetHandle")}
        className="flex h-11 shrink-0 cursor-grab touch-none items-center justify-center"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          dragOrigin.current = { y: event.clientY, height };
        }}
        onPointerMove={(event) => {
          const origin = dragOrigin.current;
          if (!origin) return;
          const next = origin.height - (event.clientY - origin.y);
          const clamped = Math.max(48, Math.min(frame.full, next));
          heightRef.current = clamped;
          setDragHeight(clamped);
        }}
        onPointerUp={() => {
          const origin = dragOrigin.current;
          dragOrigin.current = null;
          if (!origin) return;
          const current = heightRef.current;
          setDragHeight(null);
          const next = nearestSheetSnap(current, frame);
          if (next === "closed") onClose();
          else setSnap(next);
        }}
        onPointerCancel={() => {
          dragOrigin.current = null;
          setDragHeight(null);
        }}
      >
        <span className="h-1.5 w-10 rounded-full bg-[var(--border)]" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
