import { z } from "zod";
import { FASE_DATA } from "@/lib/sik/juklak";

const optStr = z.string().trim().max(4000).optional().nullable();
const optNum = z.number().min(0).optional().nullable();
const int0 = z.number().int().min(0).optional().default(0);

const korbanCellSchema = z.object({
  L: int0,
  P: int0,
});
const korbanUmurSchema = z.object({
  anak: korbanCellSchema.optional().default({ L: 0, P: 0 }),
  dewasa: korbanCellSchema.optional().default({ L: 0, P: 0 }),
  lansia: korbanCellSchema.optional().default({ L: 0, P: 0 }),
});

export const korbanTerpilahSchema = z
  .object({
    meninggal: korbanUmurSchema.optional(),
    hilang: korbanUmurSchema.optional(),
    luka: korbanUmurSchema.optional(),
    menderita: korbanUmurSchema.optional(),
    mengungsi: korbanUmurSchema.optional(),
  })
  .optional()
  .nullable();

export const kejadianWizardSchema = z.object({
  kode_jenis: z.number().int().optional().nullable(),
  jenis_bencana: z.string().trim().min(2).max(120),
  nama_kejadian: z.string().trim().min(2).max(200),
  slug_nama: z.string().trim().max(120).optional().nullable(),
  waktu_kejadian: z.string().min(8),
  tarikh: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  penyebab: optStr,
  kronologi: optStr,
  deskripsi: optStr,
  cakupan: z.enum(["desa", "kecamatan", "kabupaten", "provinsi", "nasional"]).optional().nullable(),
  kabupaten: optStr,
  kode_kabupaten: optStr,
  kecamatan: optStr,
  desa_ringkas: optStr,
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  cuaca: optStr,
  sumber_informasi: optStr,
  status_darurat: z.boolean().optional(),
  permintaan_bantuan_nasional: z.boolean().optional(),
  nomor_sk: optStr,
  sebaran_dampak: optStr,
  himbauan: optStr,
  personil_terlibat: optStr,
  kondisi_mutakhir: optStr,
  upaya_penanganan: optStr,
  is_bencana: z.boolean().optional(),
  status: z.enum(["draft", "aktif", "selesai", "diarsipkan"]).optional(),
  fase_data: z.enum(FASE_DATA).optional(),
  laporan_id: z.string().uuid().optional().nullable(),
  lokasi: z
    .array(
      z.object({
        desa: optStr,
        kecamatan: optStr,
        kabupaten: optStr,
        kode_desa_kelurahan: optStr,
        alamat: optStr,
        deskripsi: optStr,
        latitude: z.number().optional().nullable(),
        longitude: z.number().optional().nullable(),
        foto_url: optStr,
      })
    )
    .optional(),
});

export const dampakSchema = z.object({
  tanggal: z.string().min(8),
  meninggal: int0,
  luka_berat: int0,
  luka_ringan: int0,
  hilang: int0,
  mengungsi: int0,
  menderita: int0,
  rumah_rb: int0,
  rumah_rs: int0,
  rumah_rr: int0,
  rumah_terendam: int0,
  kerugian_rumah_rp: optNum,
  faskes: int0,
  pendidikan: int0,
  ibadah: int0,
  kantor: int0,
  pasar: int0,
  kerugian_pelayanan_rp: optNum,
  sapras: int0,
  kerugian_sapras_rp: optNum,
  lahan_ha: optNum,
  toko: int0,
  pabrik: int0,
  kerugian_ekonomi_rp: optNum,
  catatan: optStr,
  korban_terpilah: korbanTerpilahSchema,
  kondisi_mutakhir: optStr,
  upaya_penanganan: optStr,
  dokumentasi_url: optStr,
  kebutuhan_dana_juta: optNum,
  kebutuhan_sdm: optStr,
  kebutuhan_sapras: optStr,
  kebutuhan_logistik: optStr,
  kebutuhan_peralatan: optStr,
  aset_kedaruratan: optStr,
  pendidikan_rb: int0,
  pendidikan_rs: int0,
  pendidikan_rr: int0,
  pendidikan_terendam: int0,
  ibadah_rb: int0,
  ibadah_rs: int0,
  ibadah_rr: int0,
  ibadah_terendam: int0,
  faskes_rb: int0,
  faskes_rs: int0,
  faskes_rr: int0,
  faskes_terendam: int0,
  kantor_rb: int0,
  kantor_rs: int0,
  kantor_rr: int0,
  kantor_terendam: int0,
  pasar_rb: int0,
  pasar_rs: int0,
  pasar_rr: int0,
  pasar_terendam: int0,
  sawah_ha: optNum,
  kebun_ha: optNum,
  hutan_ha: optNum,
  kolam_ha: optNum,
  toko_rb: int0,
  toko_rs: int0,
  toko_rr: int0,
  toko_terendam: int0,
  pabrik_rb: int0,
  pabrik_rs: int0,
  pabrik_rr: int0,
  pabrik_terendam: int0,
  air_jaringan: optStr,
  listrik_jaringan: optStr,
  telekom_jaringan: optStr,
  irigasi_jaringan: optStr,
  jalan_km: optNum,
  jembatan_rb: int0,
  jembatan_rs: int0,
  jembatan_rr: int0,
  jembatan_terendam: int0,
  transportasi_jaringan: optStr,
  spbu_jaringan: optStr,
  kerugian_rinci: z.record(z.string(), z.number().min(0).nullable()).optional().nullable(),
});

const pengungsiCellSchema = z.object({
  L: int0,
  P: int0,
});

export const pengungsianKajiSchema = z.object({
  tempat_pengungsian_id: z.string().uuid(),
  tanggal: z.string().min(8),
  jumlah_kk: int0,
  jiwa: z.record(z.string(), pengungsiCellSchema).optional().nullable(),
  rentan: z.record(z.string(), z.number().min(0)).optional().nullable(),
  air_sanitasi: optStr,
});

export const faseDataSchema = z.object({
  fase_data: z.enum(FASE_DATA),
});

export const verifikasiSchema = z.object({
  laporan_id: z.string().uuid(),
});

export const permintaanPelatihanSchema = z.object({
  judul: z.string().trim().min(4).max(200),
  desa: z.string().trim().min(2).max(120),
  tanggal_rencana: z.string().min(8),
  kontak_nama: z.string().trim().min(2).max(120),
  kontak_email: z.string().email().optional().or(z.literal("")),
  kontak_telepon: z.string().trim().max(40).optional().or(z.literal("")),
  alamat: z.string().trim().min(4).max(400),
});
