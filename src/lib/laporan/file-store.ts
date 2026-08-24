import { promises as fs } from "fs";
import path from "path";

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "laporan_masyarakat.json");

export type StoredPelapor = {
  id: string;
  nama_enc: string;
  nik_hash: string;
  nik_enc: string;
  telepon_enc?: string;
  email_enc?: string;
  kontak_darurat_enc?: string;
  telepon_hash?: string;
  created_at: string;
};

export type StoredKejadian = {
  id: string;
  nomor_laporan: string;
  pelapor_id: string;
  jenis_bencana: string;
  status: string;
  latitude: number;
  longitude: number;
  kabupaten_kota: string;
  kecamatan?: string;
  desa?: string;
  provinsi: string;
  skor_urgensi: number;
  tampil_di_peta: boolean;
  jawaban_json: Record<string, unknown>;
  addendum?: string;
  submitted_at: string;
};

export type StoredPenanganan = {
  id: string;
  nomor_laporan: string;
  pelapor_id: string;
  jenis_bencana: string;
  tipe_laporan: string;
  fase_penanganan?: string;
  status: string;
  status_kebutuhan_sisa?: string;
  tanggal_penanganan: string;
  jam_penanganan?: string;
  latitude: number;
  longitude: number;
  kabupaten_kota: string;
  kecamatan?: string;
  desa?: string;
  provinsi: string;
  deskripsi_penanganan: string;
  jumlah_penerima_estimasi?: number;
  rating_kepuasan?: number;
  tampil_di_peta: boolean;
  jawaban_json: Record<string, unknown>;
  addendum?: string;
  pelaku_penanganan?: string[];
  jenis_bantuan?: string[];
  submitted_at: string;
};

export type StoredWa = {
  id: string;
  laporan_tipe: string;
  laporan_id: string;
  nomor_tujuan_enc: string;
  template_kode: string;
  payload_json: Record<string, unknown>;
  status: string;
  created_at: string;
};

type Store = {
  pelapor: StoredPelapor[];
  kejadian: StoredKejadian[];
  penanganan: StoredPenanganan[];
  wa: StoredWa[];
};

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    return JSON.parse(raw) as Store;
  } catch {
    return { pelapor: [], kejadian: [], penanganan: [], wa: [] };
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function fileStoreInsertPelapor(row: StoredPelapor) {
  const s = await readStore();
  s.pelapor.push(row);
  await writeStore(s);
}

export async function fileStoreInsertKejadian(row: StoredKejadian) {
  const s = await readStore();
  const seq = s.kejadian.length + 1;
  row.nomor_laporan =
    row.nomor_laporan ||
    `KJD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(seq).padStart(4, "0")}`;
  s.kejadian.push(row);
  await writeStore(s);
  return { seq, nomor_laporan: row.nomor_laporan };
}

export async function fileStoreInsertPenanganan(row: StoredPenanganan) {
  const s = await readStore();
  const seq = s.penanganan.length + 1;
  row.nomor_laporan =
    row.nomor_laporan ||
    `PNG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(seq).padStart(4, "0")}`;
  s.penanganan.push(row);
  await writeStore(s);
  return { seq, nomor_laporan: row.nomor_laporan };
}

export async function fileStoreQueueWa(row: StoredWa) {
  const s = await readStore();
  s.wa.push(row);
  await writeStore(s);
}

export async function fileStoreGetPetaKejadian(): Promise<StoredKejadian[]> {
  const s = await readStore();
  return s.kejadian.filter((k) => k.status === "approved" && k.tampil_di_peta);
}

export async function fileStoreGetPetaPenanganan(): Promise<StoredPenanganan[]> {
  const s = await readStore();
  return s.penanganan.filter((k) => k.status === "approved" && k.tampil_di_peta);
}
