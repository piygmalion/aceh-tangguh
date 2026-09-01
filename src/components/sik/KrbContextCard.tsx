"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { GlassPanel } from "@/components/ui/GlassPanel";
import {
  fetchKrb,
  kawasanOverlappingKab,
  lookupKrbWilayah,
} from "@/lib/krb-by-kab";
import { qk } from "@/lib/qk";
import { juklakToKrbJenis } from "@/lib/sik/krb-jenis";

export function KrbContextCard({
  kodeKabupaten,
  kodeJenis,
  namaKejadian,
}: {
  kodeKabupaten?: string | null;
  kodeJenis?: number | null;
  namaKejadian?: string | null;
}) {
  const t = useTranslations("krb");
  const jenis = juklakToKrbJenis({
    kodeJenis,
    namaKejadian,
  });

  const { data, isLoading } = useQuery({
    queryKey: qk.krb,
    queryFn: () => fetchKrb(),
    enabled: Boolean(jenis && kodeKabupaten),
    staleTime: 60_000,
  });

  if (!jenis || !kodeKabupaten) return null;

  const wilayah = data
    ? lookupKrbWilayah(data.wilayah, {
        kode: kodeKabupaten,
        jenis,
      })
    : undefined;
  const kawasan = data ? kawasanOverlappingKab(data.kawasan, kodeKabupaten) : [];
  const jenisLabel =
    data?.jenis_bahaya.find((row) => row.kode === jenis)?.label_id ??
    jenis.replace(/_/g, " ");

  return (
    <GlassPanel className="p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">
        {t("sikKicker")}
      </p>
      <h2 className="mt-1 text-sm font-semibold">{t("sikTitle")}</h2>
      <p className="mt-1 text-xs text-[var(--text-dim)]">{t("sikLead")}</p>

      {isLoading ? (
        <p className="mt-3 text-sm text-[var(--text-dim)]">{t("loading")}</p>
      ) : wilayah ? (
        <p className="mt-3 text-sm">
          <span className="font-medium">{jenisLabel}</span>
          {" · "}
          {wilayah.kabupaten}
          {" · "}
          <span className="font-semibold">{wilayah.kelas_ancaman}</span>
          {wilayah.skor_irbi != null
            ? ` · IRBI ${wilayah.skor_irbi.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
            : ""}
        </p>
      ) : (
        <p className="mt-3 text-sm text-[var(--text-dim)]">{t("sikMissing")}</p>
      )}

      {kawasan.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm">
          {kawasan.map((row) => (
            <li key={row.id}>
              {row.nama}
              <span className="text-[var(--text-dim)]">
                {" · "}
                {row.zona}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-xs text-[var(--text-dim)]">{t("sikNoAuto")}</p>
    </GlassPanel>
  );
}
