import { readFile } from "fs/promises";
import path from "path";
import { fetchAllRows, trySupabaseThenFixture } from "./supabase/fallback";
import type { TypedSupabaseClient } from "./supabase/server";
import type {
  KrbDokumenRow,
  KrbJenisBahayaRow,
  KrbKabupatenRow,
  KrbKawasanRow,
  KrbWilayahRow,
} from "./supabase/types";
import type {
  KrbDokumen,
  KrbJenisBahaya,
  KrbKabupaten,
  KrbKawasan,
  KrbPayload,
  KrbWilayah,
} from "./krb-filter";

export type {
  KrbDokumen,
  KrbJenisBahaya,
  KrbKabupaten,
  KrbKawasan,
  KrbKelasAncaman,
  KrbPayload,
  KrbQuery,
  KrbWilayah,
} from "./krb-filter";
export { filterKrb } from "./krb-filter";

function asPayload(value: unknown): KrbPayload | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  if (!Array.isArray(rec.kabupaten) || !Array.isArray(rec.wilayah)) return null;
  if (rec.kabupaten.length === 0 || rec.wilayah.length === 0) return null;
  return {
    metadata:
      rec.metadata && typeof rec.metadata === "object"
        ? (rec.metadata as Record<string, unknown>)
        : {},
    jenis_bahaya: (rec.jenis_bahaya ?? []) as KrbJenisBahaya[],
    kabupaten: rec.kabupaten as KrbKabupaten[],
    wilayah: rec.wilayah as KrbWilayah[],
    kawasan: (rec.kawasan ?? []) as KrbKawasan[],
    dokumen: (rec.dokumen ?? []) as KrbDokumen[],
  };
}

async function loadKrbFromSupabase(
  client: TypedSupabaseClient
): Promise<KrbPayload | null> {
  const [jenis_bahaya, kabupaten, wilayah, kawasan, dokumen] = await Promise.all([
    fetchAllRows<KrbJenisBahayaRow>((from, to) =>
      client.from("krb_jenis_bahaya").select("*").order("kode").range(from, to)
    ),
    fetchAllRows<KrbKabupatenRow>((from, to) =>
      client.from("krb_kabupaten").select("*").order("kode_kabupaten").range(from, to)
    ),
    fetchAllRows<KrbWilayahRow>((from, to) =>
      client.from("krb_wilayah").select("*").order("id").range(from, to)
    ),
    fetchAllRows<KrbKawasanRow>((from, to) =>
      client.from("krb_kawasan").select("*").order("id").range(from, to)
    ),
    fetchAllRows<KrbDokumenRow>((from, to) =>
      client.from("krb_dokumen").select("*").order("id").range(from, to)
    ),
  ]);

  if (kabupaten.length === 0 || wilayah.length === 0) return null;

  return {
    metadata: {
      judul: "Database Kawasan Rawan Bencana (KRB) Aceh",
      grain: "supabase",
      jumlah: {
        jenis_bahaya: jenis_bahaya.length,
        kabupaten_kota: kabupaten.length,
        wilayah: wilayah.length,
        kawasan: kawasan.length,
        dokumen: dokumen.length,
      },
    },
    jenis_bahaya,
    kabupaten,
    wilayah,
    kawasan,
    dokumen,
  };
}

export async function loadKrbFixture(): Promise<KrbPayload> {
  const file = path.join(process.cwd(), "public/fixtures/krb-aceh.json");
  const raw = await readFile(file, "utf8");
  const parsed = asPayload(JSON.parse(raw));
  if (!parsed) throw new Error("krb-aceh.json is empty or malformed");
  return parsed;
}

export async function loadKrb(): Promise<KrbPayload> {
  const loaded = await trySupabaseThenFixture(loadKrbFromSupabase, loadKrbFixture, {
    label: "krb",
    isEmpty: (value) => !value.wilayah?.length,
  });
  return { ...loaded.data, source: loaded.source };
}
