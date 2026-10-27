"use client";

import { ArrowUpRight, Clock, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { renderSumberLine } from "@/lib/sumber-label";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/Chip";
import { MapLayerIcon } from "@/components/map/MapLayerIcon";
import { requestOpenTanggapi } from "@/lib/panduan/open-tanggapi";
import {
  buildTanggapiSeedPrompt,
  shouldShowTanggapiCta,
} from "@/lib/tanggapi-distribusi";
import type { FeatureCard, FeatureCardDetail, FeatureCardTone } from "@/lib/feature-card";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { LAYER_COLORS } from "@/lib/layer-colors";
import {
  getLayerIconPath,
  getOverlayLayerIconPath,
} from "@/lib/layer-icons";
import { isOverlayLayerKey, overlayColor } from "@/lib/overlay-layers";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import type { MarkerLayerKey } from "@/lib/types";
import { cn } from "@/lib/utils";

function keepMapScroll(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

/** Compact above 24px, restore below 8px, and hold the previous state in between. */
export function nextHeaderCompact(scrollTop: number, compact: boolean): boolean {
  if (scrollTop > 24) return true;
  if (scrollTop < 8) return false;
  if (scrollTop > 0) return compact;
  return false;
}

/** Pull a card that hangs off either edge back inside, leaving `margin` px. */
export function popupHorizontalShift(
  rect: { left: number; right: number },
  viewportWidth: number,
  margin = 8,
): number {
  return shiftIntoHorizontalArea(rect, {
    left: margin,
    right: viewportWidth - margin,
  });
}

/**
 * Horizontal free-map interval. `leftRights` are the right edges of the left
 * chrome column. `rightLefts` are the left edges of right-side panels.
 */
export function freeMapHorizontalBounds(opts: {
  viewportWidth: number;
  leftRights: number[];
  rightLefts: number[];
  margin?: number;
}): { left: number; right: number } {
  const margin = opts.margin ?? 8;
  let left = margin;
  for (const edge of opts.leftRights) {
    if (edge > 0) left = Math.max(left, edge + margin);
  }
  let right = opts.viewportWidth - margin;
  for (const edge of opts.rightLefts) {
    if (edge > 0 && edge < opts.viewportWidth) right = Math.min(right, edge - margin);
  }
  if (right < left) return { left, right: left };
  return { left, right };
}

/** Shift `rect` so it sits inside `area`. Pins to `area.left` when the card is wider. */
export function shiftIntoHorizontalArea(
  rect: { left: number; right: number },
  area: { left: number; right: number },
): number {
  const width = rect.right - rect.left;
  if (width <= 0 || area.right <= area.left) return 0;
  let left = rect.left;
  if (left < area.left) left = area.left;
  const maxLeft = area.right - width;
  if (left > maxLeft) left = Math.max(area.left, maxLeft);
  return left - rect.left;
}

export type PopupRect = { left: number; top: number; right: number; bottom: number };

export function inflateRect(box: PopupRect, margin: number): PopupRect {
  return {
    left: box.left - margin,
    top: box.top - margin,
    right: box.right + margin,
    bottom: box.bottom + margin,
  };
}

function translateRect(box: PopupRect, dx: number, dy: number): PopupRect {
  return {
    left: box.left + dx,
    top: box.top + dy,
    right: box.right + dx,
    bottom: box.bottom + dy,
  };
}

function rectsOverlap(a: PopupRect, b: PopupRect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** Keep the card inside the canvas. A card wider or taller than the canvas pins to the top-left inset. */
function shiftInsideCanvas(card: PopupRect, bounds: PopupRect): { dx: number; dy: number } {
  const width = card.right - card.left;
  const height = card.bottom - card.top;
  let dx = 0;
  let dy = 0;
  if (width >= bounds.right - bounds.left) dx = bounds.left - card.left;
  else if (card.left < bounds.left) dx = bounds.left - card.left;
  else if (card.right > bounds.right) dx = bounds.right - card.right;
  if (height >= bounds.bottom - bounds.top) dy = bounds.top - card.top;
  else if (card.top < bounds.top) dy = bounds.top - card.top;
  else if (card.bottom > bounds.bottom) dy = bounds.bottom - card.bottom;
  return { dx, dy };
}

/** Smallest move that takes `card` out of `blocked`. */
function pushOutOfRect(card: PopupRect, blocked: PopupRect): { dx: number; dy: number } {
  if (!rectsOverlap(card, blocked)) return { dx: 0, dy: 0 };
  const overlapX = Math.min(card.right, blocked.right) - Math.max(card.left, blocked.left);
  const overlapY = Math.min(card.bottom, blocked.bottom) - Math.max(card.top, blocked.top);
  if (overlapX <= 0 || overlapY <= 0) return { dx: 0, dy: 0 };
  if (overlapX <= overlapY) {
    const pushLeft = blocked.left - card.right;
    const pushRight = blocked.right - card.left;
    return { dx: Math.abs(pushLeft) <= Math.abs(pushRight) ? pushLeft : pushRight, dy: 0 };
  }
  const pushUp = blocked.top - card.bottom;
  const pushDown = blocked.bottom - card.top;
  return { dx: 0, dy: Math.abs(pushUp) <= Math.abs(pushDown) ? pushUp : pushDown };
}

/**
 * Free area is the map canvas inset by `margin`, minus the legend, Pengaturan,
 * Layer panel, and attribution boxes (each grown by `margin`).
 */
export function shiftCardIntoFreeArea(opts: {
  card: PopupRect;
  canvas: PopupRect;
  obstacles: PopupRect[];
  margin?: number;
}): { dx: number; dy: number } {
  const margin = opts.margin ?? 8;
  const bounds = inflateRect(opts.canvas, -margin);
  if (bounds.right < bounds.left) bounds.right = bounds.left;
  if (bounds.bottom < bounds.top) bounds.bottom = bounds.top;
  let card = { ...opts.card };
  let dx = 0;
  let dy = 0;
  const move = (shift: { dx: number; dy: number }) => {
    if (shift.dx === 0 && shift.dy === 0) return;
    dx += shift.dx;
    dy += shift.dy;
    card = translateRect(card, shift.dx, shift.dy);
  };
  const blocked = opts.obstacles.map((box) => inflateRect(box, margin));
  move(shiftInsideCanvas(card, bounds));
  for (let pass = 0; pass < blocked.length + 1; pass += 1) {
    for (const obstacle of blocked) move(pushOutOfRect(card, obstacle));
    move(shiftInsideCanvas(card, bounds));
  }
  return { dx, dy };
}

function visibleBox(el: Element | null): DOMRect | null {
  if (!(el instanceof HTMLElement)) return null;
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return null;
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;
  return rect;
}

function rectOf(el: Element | null): PopupRect | null {
  const rect = visibleBox(el);
  if (!rect) return null;
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}

/** Canvas, then the legend, Pengaturan, Layer panel, attribution strip, report +, and ⓘ. */
export function measurePopupFreeArea(): { canvas: PopupRect; obstacles: PopupRect[] } {
  const canvas =
    rectOf(document.querySelector(".maplibregl-canvas")) ??
    rectOf(document.querySelector(".maplibregl-map")) ?? {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };
  const obstacles: PopupRect[] = [];
  for (const el of Array.from(document.querySelectorAll("[data-status-legend]"))) {
    const box = rectOf(el);
    if (box) obstacles.push(box);
  }
  const settings = rectOf(document.querySelector("[data-map-chrome='settings'] button[aria-expanded]"));
  const panel = rectOf(document.querySelector("aside[data-layer-panel]"));
  const attrib =
    rectOf(document.querySelector(".maplibregl-ctrl-bottom-right")) ??
    rectOf(document.querySelector(".maplibregl-ctrl-attrib"));
  const fab = rectOf(document.querySelector("[data-map-chrome='fab'] button"));
  const info = rectOf(document.querySelector(".maplibregl-ctrl-attrib-button"));
  for (const box of [settings, panel, attrib, fab, info]) {
    if (box) obstacles.push(box);
  }
  return { canvas, obstacles };
}

/** Clear the attribution strip, and never less than the safe-area inset. */
export function popupBottomReserve(opts: {
  viewportHeight: number;
  stripHeight: number;
  stripTop: number | null;
  safeAreaBottom: number;
}): number {
  let reserve = opts.stripHeight + 8;
  if (opts.stripTop != null && opts.stripTop < opts.viewportHeight) {
    reserve = Math.max(reserve, opts.viewportHeight - opts.stripTop + 8);
  }
  return Math.max(reserve, opts.safeAreaBottom);
}

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

/**
 * Largest height that fits in the canvas inset without entering an obstacle
 * that shares the card's horizontal span. A card taller than this has to shrink;
 * sliding it back inside the canvas would cover the obstacle again.
 */
export function maxCardHeightInFreeArea(opts: {
  card: PopupRect;
  canvas: PopupRect;
  obstacles: PopupRect[];
  margin?: number;
}): number {
  const margin = opts.margin ?? 8;
  const bounds = inflateRect(opts.canvas, -margin);
  let top = bounds.top;
  let bottom = bounds.bottom;
  for (const raw of opts.obstacles) {
    const box = inflateRect(raw, margin);
    const overlapX = Math.min(opts.card.right, box.right) - Math.max(opts.card.left, box.left);
    if (overlapX <= 0) continue;
    if (box.bottom <= top || box.top >= bottom) continue;
    const above = box.top - top;
    const below = bottom - box.bottom;
    if (above >= below) bottom = box.top;
    else top = box.bottom;
  }
  return Math.max(160, bottom - top);
}

/** Ceiling is `100dvh - 6rem - 32px`. On a narrow screen, also clear the attribution strip. */
function fitCardToViewport(el: HTMLElement) {
  const transform = el.style.transform;
  if (transform) el.style.transform = "none";
  const top = el.getBoundingClientRect().top;
  if (transform) el.style.transform = transform;
  const ceiling = window.innerHeight - 96 - 32;
  let reserve = 16;
  if (window.innerWidth < 768) {
    const strip = document.querySelector(".maplibregl-ctrl-bottom-right");
    const stripHeight = strip ? strip.getBoundingClientRect().height : 0;
    const stripTop = strip ? strip.getBoundingClientRect().top : null;
    reserve = popupBottomReserve({
      viewportHeight: window.innerHeight,
      stripHeight,
      stripTop,
      safeAreaBottom: readSafeAreaBottom(),
    });
  }
  const room = window.innerHeight - top - reserve;
  el.style.maxHeight = `${Math.round(Math.max(160, Math.min(ceiling, room)))}px`;
}

function clampCardToFreeArea(el: HTMLElement) {
  el.style.transform = "";
  const { canvas, obstacles } = measurePopupFreeArea();
  for (let pass = 0; pass < 3; pass += 1) {
    const rect = el.getBoundingClientRect();
    const card = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    const shift = shiftCardIntoFreeArea({ card, canvas, obstacles });
    const placed = translateRect(card, shift.dx, shift.dy);
    const room = maxCardHeightInFreeArea({ card: placed, canvas, obstacles });
    if (rect.height > room + 1) {
      el.style.maxHeight = `${Math.round(room)}px`;
      continue;
    }
    const dx = Math.round(shift.dx);
    const dy = Math.round(shift.dy);
    el.style.transform =
      dx === 0 && dy === 0 ? "" : `translateX(${dx}px) translateY(${dy}px)`;
    return;
  }
}

function sourceHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export async function fetchFeatureCard(
  id: string,
  layer?: string,
  signal?: AbortSignal,
): Promise<FeatureCard> {
  const qs = new URLSearchParams();
  if (layer) qs.set("layer", layer);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetchPublicApi(`/api/layers/features/${encodeURIComponent(id)}${suffix}`, {
    signal,
  });
  if (signal?.aborted) {
    const err = new Error("aborted");
    err.name = "AbortError";
    throw err;
  }
  if (!res.ok) throw new Error("feature_card_failed");
  return (await res.json()) as FeatureCard;
}

const MARKER_ICON_KEYS = new Set<string>([
  "disasterEvents",
  "missingPersons",
  "tendPoints",
  "policeOffices",
  "poskos",
  "facHealth",
  "facEducation",
  "facGov",
  "facReligious",
  "infraRoadBridge",
  "laporanKejadian",
  "laporanPenanganan",
]);

function cardIconSrc(layer: string): string | null {
  if (MARKER_ICON_KEYS.has(layer)) return getLayerIconPath(layer as MarkerLayerKey);
  if (isOverlayLayerKey(layer)) return getOverlayLayerIconPath(layer);
  return null;
}

function cardFallbackColor(layer: string): string {
  if (MARKER_ICON_KEYS.has(layer)) {
    return LAYER_COLORS[layer as MarkerLayerKey] ?? "var(--ink)";
  }
  if (isOverlayLayerKey(layer)) return overlayColor(layer);
  return "var(--ink)";
}

function detailToneClass(tone?: FeatureCardTone): string {
  if (tone === "danger") return "border border-[var(--map-keyline)] bg-[var(--status-awas)] text-[var(--map-status-awas-fg)]";
  if (tone === "warn") return "border border-[var(--map-keyline)] bg-[var(--status-waspada)] text-[var(--map-status-waspada-fg)]";
  if (tone === "ok") return "border border-[var(--map-keyline)] bg-[var(--status-aman)] text-[var(--map-status-aman-fg)]";
  return "border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text)]";
}

function DetailCard({
  item,
  label,
}: {
  item: FeatureCardDetail;
  label: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-xl border px-2.5 py-2", detailToneClass(item.tone))}>
      <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>{label}</div>
      <div className="text-[0.9375rem] font-semibold leading-snug">{item.value}</div>
    </div>
  );
}

export function MapFeatureCard({
  card,
  loading = false,
  error = false,
  onClose,
  onSelectStack,
  layout = "popup",
}: {
  card: FeatureCard | null;
  loading?: boolean;
  error?: boolean;
  onClose: () => void;
  onSelectStack?: (id: string) => void;
  /** Sheet fills its parent. Popup stays clamped to the viewport. */
  layout?: "popup" | "sheet";
}) {
  const t = useTranslations("map");
  const tPanduan = useTranslations("panduan");
  const sumberLocale = useLocale() === "en" ? "en" : "id";
  const cardRef = useRef<HTMLElement>(null);
  const [headerCompact, setHeaderCompact] = useState(false);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el || layout === "sheet") return;
    let raf = 0;
    const fit = () => {
      if (!el.isConnected) return;
      fitCardToViewport(el);
      clampCardToFreeArea(el);
    };
    const fitSettled = () => {
      fit();
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        fit();
        raf = window.requestAnimationFrame(fit);
      });
    };
    fit();
    const popup = el.closest(".maplibregl-popup");
    const obs = new MutationObserver(fitSettled);
    if (popup) obs.observe(popup, { attributes: true, attributeFilter: ["style"] });
    const resizeObs = new ResizeObserver(fit);
    resizeObs.observe(el);
    window.addEventListener("resize", fit);
    window.addEventListener("aceh:map-move", fitSettled);
    const frame = window.requestAnimationFrame(fit);
    return () => {
      obs.disconnect();
      resizeObs.disconnect();
      window.removeEventListener("resize", fit);
      window.removeEventListener("aceh:map-move", fitSettled);
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(raf);
    };
  }, [layout]);

  const title = card?.title ?? (loading ? t("cardLoading") : t("cardError"));
  const layer = card?.layer ?? "disasterEvents";
  const category = card
    ? t.has(card.categoryKey)
      ? t(card.categoryKey)
      : card.category
    : "";

  return (
    <article
      ref={cardRef}
      className={cn(
        "map-feature-card flex flex-col gap-2",
        layout === "sheet" && "h-auto max-h-none w-full shadow-none",
      )}
      data-testid="map-feature-card"
      onWheel={keepMapScroll}
      onWheelCapture={keepMapScroll}
      onTouchStart={keepMapScroll}
      onTouchStartCapture={keepMapScroll}
      onTouchMove={keepMapScroll}
      onTouchMoveCapture={keepMapScroll}
    >
      <header className="sticky top-0 z-20 shrink-0 bg-[var(--map-chrome)] pb-1">
        <div
          data-card-kicker
          className={cn(
            "mb-1 flex w-full min-w-0 items-center gap-2",
            headerCompact && "hidden",
          )}
        >
          <MapLayerIcon
            iconSrc={cardIconSrc(layer)}
            fallbackColor={cardFallbackColor(layer)}
          />
          <div className={cn("min-w-0 truncate text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>{category}</div>
          {card?.updatedAt ? (
            <div
              className={cn(
                "ml-auto flex shrink-0 items-center gap-1 text-[var(--text-dim)]",
                TYPE_FLOOR_CLASS,
              )}
            >
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{card.updatedAt}</span>
            </div>
          ) : null}
        </div>
        <div className={cn("flex items-start justify-between gap-2", layout === "sheet" && "hidden")}>
          <div className="min-w-0 flex-1">
            <h3
              data-card-heading
              className="w-full text-[1.05rem] font-semibold leading-snug text-[var(--text)]"
            >
              {title}
            </h3>
            {card?.subtitle ? (
              <p
                className={cn(
                  "w-full text-[var(--text-dim)]",
                  TYPE_FLOOR_CLASS,
                  headerCompact && "hidden",
                )}
              >
                {card.subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--text-dim)] hover:bg-[var(--bg-muted)]"
            onClick={onClose}
            aria-label={t("cardClose")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div
        className="map-feature-card-body flex min-h-0 flex-1 flex-col gap-2"
        onScroll={(event) => {
          const scrollTop = event.currentTarget.scrollTop;
          setHeaderCompact((compact) => nextHeaderCompact(scrollTop, compact));
        }}
        onWheel={keepMapScroll}
        onWheelCapture={keepMapScroll}
        onTouchStart={keepMapScroll}
        onTouchStartCapture={keepMapScroll}
        onTouchMove={keepMapScroll}
        onTouchMoveCapture={keepMapScroll}
      >
      {loading ? (
        <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("cardLoading")}</p>
      ) : null}
      {error && !card ? (
        <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("cardError")}</p>
      ) : null}

      {card?.address ? (
        <div className="map-chrome-inset rounded-xl px-2.5 py-2 text-[0.875rem] leading-snug text-[var(--text)]">
          {card.address}
        </div>
      ) : null}

      {card?.coordQuality === "truncated" ? (
        <Chip tone="warn" className={cn("px-2 py-0.5", TYPE_FLOOR_CLASS)}>
          {t("coordApprox")}
        </Chip>
      ) : null}
      {card?.coordQuality === "offshore" ? (
        <Chip tone="info" className={cn("px-2 py-0.5", TYPE_FLOOR_CLASS)}>
          {t("coordOffshore")}
        </Chip>
      ) : null}

      {card && card.media.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
            {t("media")}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {card.media.map((item) => (
              <img
                key={item.url}
                src={item.url}
                alt={item.alt ?? card.title}
                className="h-20 w-28 shrink-0 rounded-lg object-cover"
              />
            ))}
          </div>
        </section>
      ) : null}

      {card && card.details.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
            {t("detail")}
          </div>
          <div className="grid grid-cols-1 gap-2">
            {card.details.map((item) => (
              <DetailCard
                key={item.key}
                item={{
                  ...item,
                  value:
                    item.value === "Tidak ada informasi"
                      ? t("tidakAdaInformasi")
                      : item.value === "Tidak ada kerusakan"
                        ? t("tidakAdaKerusakan")
                        : item.value,
                }}
                label={t.has(item.key) ? t(item.key) : item.label}
              />
            ))}
          </div>
        </section>
      ) : null}

      {shouldShowTanggapiCta({ kodeDesa: card?.kodeDesa }) ? (
        <Button
          type="button"
          variant="accent"
          className={cn(
            "h-8 self-start px-3 text-[var(--accent-fg)]",
            TYPE_FLOOR_CLASS,
          )}
          onClick={() => {
            const seed = buildTanggapiSeedPrompt({
              kode_desa: card?.kodeDesa,
              nama: card?.title,
              kecamatan: card?.kecamatan,
              kabupaten: card?.kabupaten,
            });
            requestOpenTanggapi(seed);
          }}
        >
          {tPanduan("askHero")}
        </Button>
      ) : null}

      {card?.stack && card.stack.length > 1 ? (
        <ul className="flex max-h-36 flex-col gap-1 overflow-auto">
          <li className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
            {t("stackTitle", { count: card.stack.length })}
          </li>
          {card.stack.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-lg px-2 py-1 text-left text-[var(--text)] hover:bg-[var(--bg-muted)]",
                  TYPE_FLOOR_CLASS,
                )}
                onClick={() => onSelectStack?.(item.id)}
              >
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {card?.sources && card.sources.length > 0 ? (
        <section className="flex flex-col gap-1" data-event-sources>
          <div className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("sumber")}</div>
          <ul className="flex flex-col gap-0.5">
            {card.sources.map((entry) => {
              const isUrl = /^https?:\/\//i.test(entry);
              return (
                <li key={entry} className="text-[0.8125rem] leading-snug">
                  {isUrl ? (
                    <a
                      href={entry}
                      title={entry}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-baseline gap-0.5 text-[var(--text)] underline decoration-[1px] underline-offset-[2px] hover:decoration-[2px] focus-visible:decoration-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
                    >
                      {sourceHostname(entry)}
                      <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden />
                    </a>
                  ) : (
                    <span className="text-[var(--text-dim)]">{renderSumberLine(entry, sumberLocale)}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      </div>
    </article>
  );
}
