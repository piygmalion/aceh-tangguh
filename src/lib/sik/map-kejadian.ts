import type { KejadianDampakRow, KejadianOperasiRow } from "@/lib/sik/db-tables";
import { toDisasterJenisLabel } from "@/lib/sik/jenis-bencana";
import type { KejadianRow } from "@/lib/kejadian-types";

export function opsToKejadianRow(
  row: KejadianOperasiRow,
  latest?: KejadianDampakRow | null
): KejadianRow {
  const jenis = toDisasterJenisLabel({
    kodeJenis: row.kode_jenis,
    jenis: row.jenis_bencana,
    namaKejadian: row.nama_kejadian,
  });
  const waktu = new Date(row.waktu_kejadian);
  const hariTanggal = Number.isNaN(waktu.getTime())
    ? row.waktu_kejadian
    : waktu.toISOString().slice(0, 10);

  return {
    id: `ops-${row.id}`,
    jenis_bencana: jenis,
    hari_tanggal: hariTanggal,
    jam: Number.isNaN(waktu.getTime()) ? undefined : waktu.toISOString().slice(11, 16),
    penyebab: row.penyebab ?? undefined,
    kronologi: row.kronologi ?? row.deskripsi ?? undefined,
    lokasi: {
      kabupaten: row.kabupaten ?? undefined,
      kabupaten_kota: row.kabupaten ?? undefined,
      kecamatan: row.kecamatan ?? undefined,
      desa: row.desa_ringkas ?? undefined,
      teks_lengkap: [row.desa_ringkas, row.kecamatan, row.kabupaten].filter(Boolean).join(", "),
    },
    arah_di_peta: {
      latitude: row.latitude,
      longitude: row.longitude,
      sumber_koordinat: "kejadian_operasi",
    },
    jumlah_korban: latest
      ? {
          meninggal: latest.meninggal,
          hilang: latest.hilang,
          luka_berat: latest.luka_berat,
          luka_ringan: latest.luka_ringan,
        }
      : undefined,
    kerusakan_dan_korban: latest
      ? {
          rumah: {
            rusak_berat: latest.rumah_rb,
            rusak_sedang: latest.rumah_rs,
            rusak_ringan: latest.rumah_rr,
          },
        }
      : undefined,
    pengungsi: latest?.mengungsi ?? null,
    jiwa_terdampak: latest ? latest.menderita + latest.mengungsi : null,
    sumber_data: ["SIK operasional"],
    penanganan: {
      status_proses: row.status === "selesai" ? "selesai" : "dalam_penanganan",
    },
  };
}
