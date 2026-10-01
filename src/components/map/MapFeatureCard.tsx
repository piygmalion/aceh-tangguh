"use client";

import { Clock, X } from "lucide-react";
import { useTranslations } from "next-intl";
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

export async function fetchFeatureCard(id: string, layer?: string): Promise<FeatureCard> {
  const qs = new URLSearchParams();
  if (layer) qs.set("layer", layer);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetchPublicApi(`/api/layers/features/${encodeURIComponent(id)}${suffix}`);
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
}: {
  card: FeatureCard | null;
  loading?: boolean;
  error?: boolean;
  onClose: () => void;
  onSelectStack?: (id: string) => void;
}) {
  const t = useTranslations("map");
  const tPanduan = useTranslations("panduan");

  const title = card?.title ?? (loading ? t("cardLoading") : t("cardError"));
  const layer = card?.layer ?? "disasterEvents";
  const category = card
    ? t.has(card.categoryKey)
      ? t(card.categoryKey)
      : card.category
    : "";

  return (
    <article className="map-feature-card flex flex-col gap-2" data-testid="map-feature-card">
      <header className="flex items-start justify-between gap-2">
        <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>{category}</div>
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded-full text-[var(--text-dim)] hover:bg-[var(--bg-muted)]"
          onClick={onClose}
          aria-label={t("cardClose")}
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex items-start gap-2.5">
        <MapLayerIcon
          iconSrc={cardIconSrc(layer)}
          fallbackColor={cardFallbackColor(layer)}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="text-[1.05rem] font-semibold leading-snug text-[var(--text)]">
            {title}
          </h3>
          {card?.subtitle ? (
            <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
              {card.subtitle}
            </p>
          ) : null}
        </div>
        {card?.updatedAt ? (
          <div
            className={cn(
              "flex shrink-0 items-center gap-1 text-[var(--text-dim)]",
              TYPE_FLOOR_CLASS,
            )}
          >
            <Clock className="h-3.5 w-3.5" aria-hidden />
            <span>{card.updatedAt}</span>
          </div>
        ) : null}
      </div>

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
    </article>
  );
}
