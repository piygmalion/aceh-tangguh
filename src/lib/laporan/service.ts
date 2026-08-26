import { randomUUID } from "crypto";
import {
  computeUrgency,
  encryptPii,
  hashPii,
  validateAcehLocation,
} from "./crypto";
import type { JenisBencana } from "./definitions";
import {
  fileStoreGetPetaKejadian,
  fileStoreGetPetaPenanganan,
  fileStoreInsertKejadian,
  fileStoreInsertPelapor,
  fileStoreInsertPenanganan,
  fileStoreQueueWa,
} from "./file-store";
import type { KejadianSubmit, PenangananSubmit } from "./schemas";
import {
  KEJADIAN_PUBLIC_COLUMNS,
  PENANGANAN_PUBLIC_COLUMNS,
  type PublicPetaKejadian,
  type PublicPetaPenanganan,
} from "./status";
import { LaporanConfigError, requireLaporanWriter } from "./writer";
import type { Json } from "@/lib/supabase/types";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * Allocate a collision-safe report number via Postgres sequence RPC.
 * Fail closed — never invent numbers from wall-clock (collision risk).
 */
export async function allocateNomorLaporan(
  client: TypedSupabaseClient,
  prefix: "KJD" | "PNG"
): Promise<string> {
  const { data, error } = await client.rpc("next_laporan_nomor", { prefix });
  if (error) {
    throw new LaporanConfigError(
      `next_laporan_nomor failed: ${error.message}. Apply 20260902_harden_laporan_rls.sql`
    );
  }
  if (typeof data !== "string" || data.length === 0) {
    throw new LaporanConfigError(
      "next_laporan_nomor returned empty — check laporan nomor sequences"
    );
  }
  return data;
}

async function insertPelapor(
  writer: ReturnType<typeof requireLaporanWriter>,
  data: KejadianSubmit["pelapor"]
) {
  const id = randomUUID();
  const row = {
    id,
    nama_enc: encryptPii(data.nama),
    nik_hash: hashPii(data.nik),
    nik_enc: encryptPii(data.nik),
    telepon_enc: data.telepon ? encryptPii(data.telepon) : null,
    email_enc: data.email ? encryptPii(data.email) : null,
    kontak_darurat_enc: data.kontak_darurat ? encryptPii(data.kontak_darurat) : null,
    telepon_hash: data.telepon ? hashPii(data.telepon) : null,
  };

  if (writer.kind === "supabase") {
    const { error } = await writer.client.from("laporan_pelapor").insert(row);
    if (error) throw new Error(error.message);
  } else {
    await fileStoreInsertPelapor({
      ...row,
      telepon_enc: row.telepon_enc ?? undefined,
      email_enc: row.email_enc ?? undefined,
      kontak_darurat_enc: row.kontak_darurat_enc ?? undefined,
      telepon_hash: row.telepon_hash ?? undefined,
      created_at: new Date().toISOString(),
    });
  }
  return id;
}

export async function queueWaNotification(
  laporanTipe: "kejadian" | "penanganan",
  laporanId: string,
  telepon: string,
  template: string,
  payload: Record<string, unknown>
) {
  const writer = requireLaporanWriter();
  const row = {
    id: randomUUID(),
    laporan_tipe: laporanTipe,
    laporan_id: laporanId,
    nomor_tujuan_enc: encryptPii(telepon),
    template_kode: template,
    payload_json: payload as Json,
    status: "pending" as const,
  };
  if (writer.kind === "supabase") {
    await writer.client.from("notifikasi_wa").insert(row);
  } else {
    await fileStoreQueueWa({
      ...row,
      payload_json: payload,
      created_at: new Date().toISOString(),
    });
  }
}

export async function submitKejadian(body: KejadianSubmit) {
  validateAcehLocation(body.lokasi.latitude, body.lokasi.longitude);
  const writer = requireLaporanWriter();
  const pelaporId = await insertPelapor(writer, body.pelapor);
  const id = randomUUID();
  const skor = Math.min(200, Math.max(0, computeUrgency(body.jenis_bencana as JenisBencana, body.jawaban)));
  const now = new Date().toISOString();

  let nomor: string;

  if (writer.kind === "supabase") {
    nomor = await allocateNomorLaporan(writer.client, "KJD");
    const { error } = await writer.client.from("laporan_kejadian").insert({
      id,
      nomor_laporan: nomor,
      pelapor_id: pelaporId,
      jenis_bencana: body.jenis_bencana,
      status: "submitted",
      latitude: body.lokasi.latitude,
      longitude: body.lokasi.longitude,
      kabupaten_kota: body.lokasi.kabupaten_kota,
      kecamatan: body.lokasi.kecamatan ?? null,
      desa: body.lokasi.desa ?? null,
      skor_urgensi: skor,
      tampil_di_peta: false,
      jawaban_json: body.jawaban as Json,
      addendum: body.addendum ?? null,
      submitted_at: now,
    });
    if (error) throw new Error(error.message);
  } else {
    const inserted = await fileStoreInsertKejadian({
      id,
      nomor_laporan: "",
      pelapor_id: pelaporId,
      jenis_bencana: body.jenis_bencana,
      status: "submitted",
      latitude: body.lokasi.latitude,
      longitude: body.lokasi.longitude,
      kabupaten_kota: body.lokasi.kabupaten_kota,
      kecamatan: body.lokasi.kecamatan,
      desa: body.lokasi.desa,
      provinsi: "Aceh",
      skor_urgensi: skor,
      tampil_di_peta: false,
      jawaban_json: body.jawaban,
      addendum: body.addendum,
      submitted_at: now,
    });
    nomor = inserted.nomor_laporan;
  }

  if (body.pelapor.telepon) {
    await queueWaNotification("kejadian", id, body.pelapor.telepon, "laporan_submitted", {
      nomor_laporan: nomor,
      jenis: body.jenis_bencana,
    });
  }

  return { id, nomor_laporan: nomor, skor_urgensi: skor, status: "submitted" as const };
}

export async function submitPenanganan(body: PenangananSubmit) {
  validateAcehLocation(body.lokasi.latitude, body.lokasi.longitude);
  const writer = requireLaporanWriter();
  const pelaporId = await insertPelapor(writer, body.pelapor);
  const id = randomUUID();
  const now = new Date().toISOString();

  let nomor: string;

  if (writer.kind === "supabase") {
    nomor = await allocateNomorLaporan(writer.client, "PNG");
    const { error } = await writer.client.from("laporan_penanganan").insert({
      id,
      nomor_laporan: nomor,
      pelapor_id: pelaporId,
      jenis_bencana: body.jenis_bencana,
      tipe_laporan: body.tipe_laporan,
      fase_penanganan: body.fase_penanganan ?? null,
      status: "submitted",
      status_kebutuhan_sisa: body.status_kebutuhan_sisa ?? null,
      tanggal_penanganan: body.tanggal_penanganan,
      jam_penanganan: body.jam_penanganan ?? null,
      latitude: body.lokasi.latitude,
      longitude: body.lokasi.longitude,
      kabupaten_kota: body.lokasi.kabupaten_kota,
      kecamatan: body.lokasi.kecamatan ?? null,
      desa: body.lokasi.desa ?? null,
      deskripsi_penanganan: body.deskripsi_penanganan,
      jumlah_penerima_estimasi: body.jumlah_penerima_estimasi ?? null,
      rating_kepuasan: body.rating_kepuasan ?? null,
      tampil_di_peta: false,
      jawaban_json: body.jawaban as Json,
      addendum: body.addendum ?? null,
      submitted_at: now,
    });
    if (error) throw new Error(error.message);
  } else {
    const inserted = await fileStoreInsertPenanganan({
      id,
      nomor_laporan: "",
      pelapor_id: pelaporId,
      jenis_bencana: body.jenis_bencana,
      tipe_laporan: body.tipe_laporan,
      fase_penanganan: body.fase_penanganan,
      status: "submitted",
      status_kebutuhan_sisa: body.status_kebutuhan_sisa,
      tanggal_penanganan: body.tanggal_penanganan,
      jam_penanganan: body.jam_penanganan,
      latitude: body.lokasi.latitude,
      longitude: body.lokasi.longitude,
      kabupaten_kota: body.lokasi.kabupaten_kota,
      kecamatan: body.lokasi.kecamatan,
      desa: body.lokasi.desa,
      provinsi: "Aceh",
      deskripsi_penanganan: body.deskripsi_penanganan,
      jumlah_penerima_estimasi: body.jumlah_penerima_estimasi,
      rating_kepuasan: body.rating_kepuasan,
      tampil_di_peta: false,
      jawaban_json: body.jawaban,
      addendum: body.addendum,
      pelaku_penanganan: body.pelaku_penanganan,
      jenis_bantuan: body.jenis_bantuan,
      submitted_at: now,
    });
    nomor = inserted.nomor_laporan;
  }

  if (body.pelapor.telepon) {
    await queueWaNotification("penanganan", id, body.pelapor.telepon, "laporan_submitted", {
      nomor_laporan: nomor,
      tipe: body.tipe_laporan,
    });
  }

  return { id, nomor_laporan: nomor, status: "submitted" as const, tampil_di_peta: false };
}

function hasMapCoords(row: { latitude?: number | null; longitude?: number | null }) {
  return (
    typeof row.latitude === "number" &&
    Number.isFinite(row.latitude) &&
    typeof row.longitude === "number" &&
    Number.isFinite(row.longitude)
  );
}

/** Moderated = `status = approved` AND `tampil_di_peta = true` AND lat/lon present. No jawaban_json. */
export async function getPetaKejadianPublik(): Promise<PublicPetaKejadian[]> {
  const supabase = createServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("laporan_kejadian")
      .select(KEJADIAN_PUBLIC_COLUMNS)
      .eq("status", "approved")
      .eq("tampil_di_peta", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("skor_urgensi", { ascending: false });
    if (!error && data) {
      return data.filter(hasMapCoords).map((r) => ({
        ...r,
        laporan_tipe: "kejadian" as const,
      }));
    }
  }
  const rows = await fileStoreGetPetaKejadian();
  return rows.filter(hasMapCoords).map((r) => ({
    id: r.id,
    nomor_laporan: r.nomor_laporan,
    jenis_bencana: r.jenis_bencana,
    latitude: r.latitude,
    longitude: r.longitude,
    kabupaten_kota: r.kabupaten_kota,
    kecamatan: r.kecamatan ?? null,
    desa: r.desa ?? null,
    skor_urgensi: r.skor_urgensi,
    submitted_at: r.submitted_at,
    laporan_tipe: "kejadian" as const,
  }));
}

/** Same moderation gate as kejadian; live query (not marker_features sync). */
export async function getPetaPenangananPublik(): Promise<PublicPetaPenanganan[]> {
  const supabase = createServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("laporan_penanganan")
      .select(PENANGANAN_PUBLIC_COLUMNS)
      .eq("status", "approved")
      .eq("tampil_di_peta", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("submitted_at", { ascending: false });
    if (!error && data) {
      return data.filter(hasMapCoords).map((r) => ({
        ...r,
        laporan_tipe: "penanganan" as const,
      }));
    }
  }
  const rows = await fileStoreGetPetaPenanganan();
  return rows.filter(hasMapCoords).map((r) => ({
    id: r.id,
    nomor_laporan: r.nomor_laporan,
    jenis_bencana: r.jenis_bencana,
    tipe_laporan: r.tipe_laporan,
    fase_penanganan: r.fase_penanganan ?? null,
    status_kebutuhan_sisa: r.status_kebutuhan_sisa ?? null,
    tanggal_penanganan: r.tanggal_penanganan,
    deskripsi_penanganan: r.deskripsi_penanganan,
    latitude: r.latitude,
    longitude: r.longitude,
    kabupaten_kota: r.kabupaten_kota,
    kecamatan: r.kecamatan ?? null,
    desa: r.desa ?? null,
    submitted_at: r.submitted_at,
    laporan_tipe: "penanganan" as const,
  }));
}

export { LaporanConfigError };
