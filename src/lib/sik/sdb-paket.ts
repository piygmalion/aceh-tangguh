import {
  KERUGIAN_RINCI_LABEL,
  PENGUNGSI_BAND,
  PENGUNGSI_BAND_LABEL,
  RENTAN_PENGUNGSI_KEYS,
  RENTAN_PENGUNGSI_LABEL,
  coerceRekapStatis,
  emptyKorbanTerpilah,
  normalizeKerugianRinci,
  normalizeKorbanTerpilah,
  normalizePengungsiJiwa,
  normalizeRentanPengungsi,
  rekapStatis,
  type KerugianRinci,
  type KorbanTerpilah,
  type RekapStatis,
} from "@/lib/sik/juklak";
import { snapshotFromDampak } from "@/lib/sik/kejadian-write";
import type {
  KejadianDampakRow,
  KejadianOperasiRow,
  PengungsianKajiRow,
} from "@/lib/sik/db-tables";

export const LAMPIRAN_II_META = {
  meninggal: { konsep: "Meninggal dunia akibat bencana", satuan: "jiwa", aturan: "nominal terakhir" },
  hilang: { konsep: "Hilang", satuan: "jiwa", aturan: "nominal terakhir" },
  luka: { konsep: "Luka/sakit", satuan: "jiwa", aturan: "terbesar selama kejadian" },
  menderita: { konsep: "Menderita/terdampak", satuan: "jiwa", aturan: "terbesar selama kejadian" },
  mengungsi: { konsep: "Mengungsi", satuan: "jiwa", aturan: "terbesar selama kejadian" },
  rumah: { konsep: "Rumah RB/RS/RR/terendam", satuan: "unit", aturan: "nominal terakhir" },
  kerugian: { konsep: "Taksiran kerugian", satuan: "Rp juta", aturan: "nominal terakhir per jenis" },
  lahan: { konsep: "Lahan terdampak", satuan: "ha", aturan: "nominal terakhir" },
} as const;

type TempatPengungsianLite = {
  id: string;
  nama: string;
  jenis_pos?: string | null;
  tanggal_buka?: string | null;
  tanggal_tutup?: string | null;
  kota_terdekat?: string | null;
  kabupaten?: string | null;
  kecamatan?: string | null;
  desa?: string | null;
};

function dampakSource(item: KejadianOperasiRow, dampak: KejadianDampakRow[]): RekapStatis | null {
  if (item.fase_data === "statis") {
    const fromRekap = coerceRekapStatis(item.rekap_statis);
    if (fromRekap) return fromRekap;
  }
  if (dampak.length === 0) return null;
  return rekapStatis(dampak.map(snapshotFromDampak));
}

export function bangunSdbPaket(input: {
  kejadian: KejadianOperasiRow;
  dampak: KejadianDampakRow[];
  kaji: PengungsianKajiRow[];
  tempat: TempatPengungsianLite[];
}) {
  const { kejadian, dampak, kaji, tempat } = input;
  const rekap = dampakSource(kejadian, dampak);
  const matrix: KorbanTerpilah = rekap?.korban_terpilah ?? emptyKorbanTerpilah();
  const rinci: KerugianRinci = rekap?.kerugian_rinci ?? normalizeKerugianRinci(null);
  const tempatById = new Map(tempat.map((t) => [t.id, t]));

  return {
    skema: "juklak-7-2023+juklak-9-2023",
    diekspor_pada: new Date().toISOString(),
    kanal: "paket-manual-walidata",
    catatan: "Tidak ada POST ke data.bnpb.go.id. Serahkan JSON ini ke walidata daerah.",
    identitas: {
      kib: kejadian.kib,
      kib_index: kejadian.kib_index,
      kib_sumber: kejadian.kib_sumber,
      kode_kabupaten_kib: kejadian.kode_kabupaten_kib,
      kode_kabupaten: kejadian.kode_kabupaten,
      kode_kecamatan: kejadian.kode_kecamatan,
      kode_desa_kelurahan: kejadian.kode_desa_kelurahan,
      kode_jenis: kejadian.kode_jenis,
      jenis_bencana: kejadian.jenis_bencana,
      nama_kejadian: kejadian.nama_kejadian,
      nomor: kejadian.nomor,
      tarikh: kejadian.tarikh,
      waktu_kejadian: kejadian.waktu_kejadian,
      fase_data: kejadian.fase_data,
      is_bencana: kejadian.is_bencana,
      latitude: kejadian.latitude,
      longitude: kejadian.longitude,
      kabupaten: kejadian.kabupaten,
      kecamatan: kejadian.kecamatan,
      desa_ringkas: kejadian.desa_ringkas,
    },
    lampiran_i: {
      kejadian: {
        penyebab: kejadian.penyebab,
        kronologi: kejadian.kronologi,
        deskripsi: kejadian.deskripsi,
        kondisi_mutakhir: rekap?.kondisi_mutakhir ?? kejadian.kondisi_mutakhir,
        upaya_penanganan: rekap?.upaya_penanganan ?? kejadian.upaya_penanganan,
        status_darurat: kejadian.status_darurat,
        permintaan_bantuan_nasional: kejadian.permintaan_bantuan_nasional,
      },
      kebutuhan: {
        dana_juta: rekap?.kebutuhan_dana_juta ?? null,
        sdm: rekap?.kebutuhan_sdm ?? null,
        sapras: rekap?.kebutuhan_sapras ?? null,
        logistik: rekap?.kebutuhan_logistik ?? null,
        peralatan: rekap?.kebutuhan_peralatan ?? null,
      },
      manusia: {
        meninggal: rekap?.meninggal ?? 0,
        hilang: rekap?.hilang ?? 0,
        luka: rekap?.luka ?? 0,
        menderita: rekap?.menderita ?? 0,
        mengungsi: rekap?.mengungsi ?? 0,
        korban_terpilah: matrix,
      },
      ekonomi: {
        sawah_ha: rekap?.sawah_ha ?? null,
        lahan_ha: rekap?.lahan_ha ?? null,
        kebun_ha: rekap?.kebun_ha ?? null,
        hutan_ha: rekap?.hutan_ha ?? null,
        kolam_ha: rekap?.kolam_ha ?? null,
        kerugian_rinci: Object.fromEntries(
          (Object.keys(KERUGIAN_RINCI_LABEL) as Array<keyof typeof KERUGIAN_RINCI_LABEL>).map((k) => [
            k,
            { label: KERUGIAN_RINCI_LABEL[k], juta: rinci[k] },
          ])
        ),
        kerugian_ekonomi_rp: rekap?.kerugian_ekonomi_rp ?? null,
      },
      sapras: {
        air_jaringan: rekap?.air_jaringan ?? null,
        listrik_jaringan: rekap?.listrik_jaringan ?? null,
        telekom_jaringan: rekap?.telekom_jaringan ?? null,
        irigasi_jaringan: rekap?.irigasi_jaringan ?? null,
        jalan_km: rekap?.jalan_km ?? null,
        transportasi_jaringan: rekap?.transportasi_jaringan ?? null,
        spbu_jaringan: rekap?.spbu_jaringan ?? null,
        kerugian_sapras_rp: rekap?.kerugian_sapras_rp ?? null,
      },
      rumah: {
        rb: rekap?.rumah_rb ?? 0,
        rs: rekap?.rumah_rs ?? 0,
        rr: rekap?.rumah_rr ?? 0,
        terendam: rekap?.rumah_terendam ?? 0,
        kerugian_rumah_rp: rekap?.kerugian_rumah_rp ?? null,
      },
      pelayanan: {
        pendidikan: { rb: rekap?.pendidikan_rb ?? 0, rs: rekap?.pendidikan_rs ?? 0, rr: rekap?.pendidikan_rr ?? 0 },
        ibadah: { rb: rekap?.ibadah_rb ?? 0, rs: rekap?.ibadah_rs ?? 0, rr: rekap?.ibadah_rr ?? 0 },
        faskes: { rb: rekap?.faskes_rb ?? 0, rs: rekap?.faskes_rs ?? 0, rr: rekap?.faskes_rr ?? 0 },
        kantor: { rb: rekap?.kantor_rb ?? 0, rs: rekap?.kantor_rs ?? 0, rr: rekap?.kantor_rr ?? 0 },
        pasar: { rb: rekap?.pasar_rb ?? 0, rs: rekap?.pasar_rs ?? 0, rr: rekap?.pasar_rr ?? 0 },
        kerugian_pelayanan_rp: rekap?.kerugian_pelayanan_rp ?? null,
      },
      aset_kedaruratan: rekap?.aset_kedaruratan ?? null,
    },
    lampiran_ii: LAMPIRAN_II_META,
    pengungsi_juklak_9: {
      pos: tempat,
      kaji: kaji.map((row) => {
        const jiwa = normalizePengungsiJiwa(row.jiwa);
        const rentan = normalizeRentanPengungsi(row.rentan);
        return {
          id: row.id,
          tempat_pengungsian_id: row.tempat_pengungsian_id,
          nama_pos: tempatById.get(row.tempat_pengungsian_id)?.nama ?? null,
          tanggal: row.tanggal,
          jumlah_kk: row.jumlah_kk,
          jiwa: Object.fromEntries(
            PENGUNGSI_BAND.map((b) => [b, { label: PENGUNGSI_BAND_LABEL[b], ...jiwa[b] }])
          ),
          rentan: Object.fromEntries(
            RENTAN_PENGUNGSI_KEYS.map((k) => [k, { label: RENTAN_PENGUNGSI_LABEL[k], nilai: rentan[k] }])
          ),
          air_sanitasi: row.air_sanitasi,
        };
      }),
    },
  };
}

export { snapshotFromDampak, normalizeKorbanTerpilah };
