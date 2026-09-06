"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import { recentAduanCards, topJenisBencana } from "@/lib/map-participation";
import type { PublicPetaKejadian, PublicPetaPenanganan } from "@/lib/laporan/status";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

type PetaPayload = {
  kejadian: { count: number; items: PublicPetaKejadian[] };
  penanganan: { count: number; items: PublicPetaPenanganan[] };
};

type SummaryPayload = { aduan: number; ditanggapi: number };

async function fetchPeta(): Promise<PetaPayload> {
  const res = await fetchPublicApi("/api/laporan/peta");
  if (!res.ok) throw new Error("peta fetch failed");
  return res.json();
}

async function fetchSummary(): Promise<SummaryPayload> {
  const res = await fetchPublicApi("/api/laporan/summary");
  if (!res.ok) return { aduan: 0, ditanggapi: 0 };
  return res.json();
}

export function MapParticipationPanels() {
  const t = useTranslations("map");
  const peta = useQuery({ queryKey: [...qk.markers(["laporanKejadian"]), "peta-widgets"], queryFn: fetchPeta });
  const summary = useQuery({ queryKey: ["laporan-summary"], queryFn: fetchSummary });
  const cards = recentAduanCards(peta.data?.kejadian.items ?? [], peta.data?.penanganan.items ?? [], 3);
  const topik = topJenisBencana([
    ...(peta.data?.kejadian.items ?? []),
    ...(peta.data?.penanganan.items ?? []),
  ]);
  const aduan = summary.data?.aduan ?? 0;
  const ditanggapi = summary.data?.ditanggapi ?? 0;

  return (
    <div className="pointer-events-auto absolute left-3 top-24 z-30 hidden w-[19.5rem] flex-col gap-2 md:flex">
      <section className="map-chrome-elevated rounded-2xl p-3">
        <h2 className={cn("mb-2 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>{t("aduanTerkini")}</h2>
        {cards.length === 0 ? (
          <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("aduanEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {cards.map((card) => (
              <li key={card.id} className="rounded-xl border border-[var(--border)] px-3 py-2">
                <p className="text-sm font-medium leading-snug">{card.title}</p>
                <p className={cn("mt-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                  {card.tempat}
                  {card.submittedAt ? ` · ${card.submittedAt.slice(0, 10)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="map-chrome-elevated rounded-2xl p-3">
        <h2 className={cn("mb-2 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>{t("top5Topik")}</h2>
        {topik.length === 0 ? (
          <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("aduanEmpty")}</p>
        ) : (
          <ol className="space-y-1.5">
            {topik.map((item, i) => (
              <li key={item.key} className="flex items-center justify-between text-sm">
                <span>
                  {i + 1}. {item.label}
                </span>
                <span className="tabular-nums text-[var(--text-dim)]">{item.count}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section className="map-chrome-elevated rounded-2xl p-3">
        <h2 className={cn("mb-2 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>{t("statistikTanggapi")}</h2>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-[var(--bg-muted)] px-3 py-2">
            <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>{t("statAduan")}</div>
            <div className="text-xl font-semibold tabular-nums">{aduan}</div>
          </div>
          <div className="rounded-xl bg-[var(--bg-muted)] px-3 py-2">
            <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>{t("statDitanggapi")}</div>
            <div className="text-xl font-semibold tabular-nums">{ditanggapi}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
