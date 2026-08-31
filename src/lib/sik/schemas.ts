import { z } from "zod";

const optStr = z.string().trim().max(4000).optional().nullable();

export const kejadianWizardSchema = z.object({
  kode_jenis: z.number().int().optional().nullable(),
  jenis_bencana: z.string().trim().min(2).max(120),
  nama_kejadian: z.string().trim().min(2).max(200),
  slug_nama: z.string().trim().max(120).optional().nullable(),
  waktu_kejadian: z.string().min(8),
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
  nomor_sk: optStr,
  sebaran_dampak: optStr,
  himbauan: optStr,
  personil_terlibat: optStr,
  is_bencana: z.boolean().optional(),
  status: z.enum(["draft", "aktif", "selesai", "diarsipkan"]).optional(),
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
  meninggal: z.number().int().min(0).default(0),
  luka_berat: z.number().int().min(0).default(0),
  luka_ringan: z.number().int().min(0).default(0),
  hilang: z.number().int().min(0).default(0),
  mengungsi: z.number().int().min(0).default(0),
  menderita: z.number().int().min(0).default(0),
  rumah_rb: z.number().int().min(0).default(0),
  rumah_rs: z.number().int().min(0).default(0),
  rumah_rr: z.number().int().min(0).default(0),
  rumah_terendam: z.number().int().min(0).default(0),
  kerugian_rumah_rp: z.number().min(0).optional().nullable(),
  faskes: z.number().int().min(0).default(0),
  pendidikan: z.number().int().min(0).default(0),
  ibadah: z.number().int().min(0).default(0),
  kantor: z.number().int().min(0).default(0),
  pasar: z.number().int().min(0).default(0),
  kerugian_pelayanan_rp: z.number().min(0).optional().nullable(),
  sapras: z.number().int().min(0).default(0),
  kerugian_sapras_rp: z.number().min(0).optional().nullable(),
  lahan_ha: z.number().min(0).optional().nullable(),
  toko: z.number().int().min(0).default(0),
  pabrik: z.number().int().min(0).default(0),
  kerugian_ekonomi_rp: z.number().min(0).optional().nullable(),
  catatan: optStr,
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
