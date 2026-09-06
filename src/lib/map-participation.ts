import type { PublicPetaKejadian, PublicPetaPenanganan } from "@/lib/laporan/status";
import { JENIS_BENCANA_JUKLAK } from "@/lib/sik/jenis-bencana";

export type MapAduanCard = {
  id: string;
  title: string;
  submittedAt: string;
  tempat: string;
  tipe: "kejadian" | "penanganan";
};

export type MapTopikCount = {
  key: string;
  label: string;
  count: number;
};

function jenisLabel(raw: string): string {
  const slug = raw.trim().toLowerCase();
  for (const entry of JENIS_BENCANA_JUKLAK) {
    if (entry.jenis.toLowerCase() === slug || entry.labelPeta.toLowerCase() === slug) {
      return entry.jenis;
    }
    if (entry.namaKejadian.some((n) => n.slug === slug || n.nama.toLowerCase() === slug)) {
      return entry.jenis;
    }
  }
  return raw.trim() || "Lainnya";
}

export function aduanCardFromPetaItem(
  item: PublicPetaKejadian | PublicPetaPenanganan
): MapAduanCard {
  const tempat = [item.desa, item.kecamatan, item.kabupaten_kota].filter(Boolean).join(", ");
  const title =
    item.laporan_tipe === "penanganan"
      ? String(item.deskripsi_penanganan ?? item.jenis_bencana).slice(0, 80)
      : `${item.jenis_bencana}${item.desa ? ` · ${item.desa}` : ""}`;
  return {
    id: item.id,
    title,
    submittedAt: item.submitted_at,
    tempat,
    tipe: item.laporan_tipe,
  };
}

export function recentAduanCards(
  kejadian: PublicPetaKejadian[],
  penanganan: PublicPetaPenanganan[],
  limit = 3
): MapAduanCard[] {
  return [...kejadian, ...penanganan]
    .map(aduanCardFromPetaItem)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, limit);
}

export function topJenisBencana(
  items: Array<{ jenis_bencana: string }>,
  limit = 5
): MapTopikCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = jenisLabel(item.jenis_bencana);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ key: label, label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}
