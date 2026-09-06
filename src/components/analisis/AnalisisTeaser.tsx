"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { analisisStateToParams } from "@/lib/analisis-url";
import type { KejadianAnalisisPayload } from "@/lib/kejadian-analisis";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

type TeaserFilters = {
  jenis?: string;
  kabupaten?: string;
  kecamatan?: string;
  status?: string;
  from?: string;
  to?: string;
};

async function fetchAnalisis(filters: TeaserFilters): Promise<KejadianAnalisisPayload> {
  const sp = new URLSearchParams();
  if (filters.jenis) sp.set("jenis", filters.jenis);
  if (filters.kabupaten) sp.set("kabupaten", filters.kabupaten);
  if (filters.kecamatan) sp.set("kecamatan", filters.kecamatan);
  if (filters.status) sp.set("status", filters.status);
  if (filters.from) sp.set("from", filters.from);
  if (filters.to) sp.set("to", filters.to);
  const qs = sp.toString();
  const res = await fetchPublicApi(`/api/kejadian/analisis${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("analisis");
  return res.json();
}

function hrefFor(filters: TeaserFilters) {
  const params = analisisStateToParams({
    jenis: filters.jenis ?? "",
    kab: filters.kabupaten ?? "",
    kec: filters.kecamatan ?? "",
    from: filters.from ?? "",
    to: filters.to ?? "",
    metric: "kejadian",
    compareKab: "",
    compareYear: "",
    view: "",
    ancaman: "",
  });
  return {
    pathname: "/analisis-data" as const,
    query: Object.fromEntries(params.entries()),
  };
}

export function AnalisisTeaser({ filters }: { filters: TeaserFilters }) {
  const t = useTranslations("analisisData");
  const locale = useLocale();
  const { data, isError } = useQuery({
    queryKey: qk.kejadianAnalisis({
      jenis: filters.jenis,
      kabupaten: filters.kabupaten,
      kecamatan: filters.kecamatan,
      status: filters.status,
      from: filters.from,
      to: filters.to,
    }),
    queryFn: () => fetchAnalisis(filters),
    staleTime: 30_000,
  });

  const fmt = (n: number) => n.toLocaleString(locale === "id" ? "id-ID" : "en-US");

  return (
    <GlassPanel className="p-4 md:p-5">
      <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
        {t("kicker")}
      </div>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">{t("title")}</h2>
      <p className="mt-1 text-sm text-[var(--text-dim)]">{t("teaserLead")}</p>
      {isError ? (
        <p className="mt-3 text-sm text-[var(--danger)]">{t("error")}</p>
      ) : !data ? (
        <p className="mt-3 text-sm text-[var(--text-dim)]">{t("loading")}</p>
      ) : data.total === 0 ? (
        <p className="mt-3 text-sm text-[var(--text-dim)]">{t("empty")}</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <TeaserKpi label={t("kpiKejadian")} value={fmt(data.total)} />
          <TeaserKpi label={t("kpiRr")} value={fmt(data.impact.rr)} />
          <TeaserKpi label={t("kpiRb")} value={fmt(data.impact.rb)} />
          <TeaserKpi
            label={t("kpiMeninggal")}
            value={fmt(data.impact.meninggal + data.impact.hilang)}
          />
        </div>
      )}
      <p className="mt-4 text-sm">
        <Link
          href={hrefFor(filters)}
          className="font-medium text-[var(--primary)] hover:underline"
        >
          {t("openInteractive")}
        </Link>
      </p>
    </GlassPanel>
  );
}

function TeaserKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg-muted)]/40 px-3 py-3">
      <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
