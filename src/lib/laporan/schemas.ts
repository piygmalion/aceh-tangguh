import { z } from "zod";
import { LAPORAN_JENIS_SLUGS } from "@/lib/sik/juklak";

export const pelaporSchema = z.object({
  nama: z.string().min(2).max(120),
  nik: z.string().regex(/^\d{16}$/),
  telepon: z.string().min(8).max(20).optional(),
  email: z.string().email().optional(),
  kontak_darurat: z.string().optional(),
}).refine((d) => d.telepon || d.email, {
  message: "Telepon atau email wajib diisi",
});

export const lokasiSchema = z.object({
  latitude: z.number().min(1.5).max(6.5),
  longitude: z.number().min(95).max(98.5),
  kabupaten_kota: z.string().min(2),
  kecamatan: z.string().optional(),
  desa: z.string().optional(),
});

export const kejadianSubmitSchema = z.object({
  jenis_bencana: z.enum(LAPORAN_JENIS_SLUGS),
  lokasi: lokasiSchema,
  pelapor: pelaporSchema,
  jawaban: z.record(z.unknown()).default({}),
  addendum: z.string().max(500).optional(),
  consent: z.literal(true),
});

export const penangananSubmitSchema = z.object({
  jenis_bencana: z.enum(LAPORAN_JENIS_SLUGS),
  tipe_laporan: z.enum([
    "bantuan_diterima",
    "bantuan_belum_diterima",
    "aktivitas_penanganan",
    "umpan_balik",
  ]),
  tanggal_penanganan: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  jam_penanganan: z.string().optional(),
  fase_penanganan: z.enum(["tanggap_darurat", "penanganan", "rehabilitasi"]).optional(),
  status_kebutuhan_sisa: z.enum(["terpenuhi", "parsial", "belum_terpenuhi"]).optional(),
  lokasi: lokasiSchema,
  pelapor: pelaporSchema,
  deskripsi_penanganan: z.string().min(50).max(5000),
  pelaku_penanganan: z.array(z.string()).default([]),
  jenis_bantuan: z.array(z.string()).default([]),
  jumlah_penerima_estimasi: z.number().int().positive().optional(),
  rating_kepuasan: z.number().int().min(1).max(5).optional(),
  jawaban: z.record(z.unknown()).default({}),
  addendum: z.string().max(500).optional(),
});

export type KejadianSubmit = z.infer<typeof kejadianSubmitSchema>;
export type PenangananSubmit = z.infer<typeof penangananSubmitSchema>;
