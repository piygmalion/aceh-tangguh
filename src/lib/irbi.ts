import { readFile } from "fs/promises";
import path from "path";
import {
  asRecord,
  readDocumentPayload,
  trySupabaseThenFixture,
  type DomainSource,
} from "./supabase/fallback";
import { createServerClient, type TypedSupabaseClient } from "./supabase/server";

export type IrbiKab = Record<string, unknown> & {
  kabupaten_kota?: string;
  kabupaten_kota_kode?: string;
};

export type IrbiPayload = {
  metadata: Record<string, unknown>;
  kabupaten_kota: IrbiKab[];
  source?: DomainSource | "supabase+fixture";
};

const IRBI_KEYS = ["irbi-2025", "irbi2025", "irbi"];

function asIrbiPayload(value: unknown): IrbiPayload | null {
  const rec = asRecord(value);
  if (!Array.isArray(rec.kabupaten_kota) || rec.kabupaten_kota.length === 0) {
    return null;
  }
  return {
    metadata: asRecord(rec.metadata),
    kabupaten_kota: rec.kabupaten_kota as IrbiKab[],
  };
}

async function mergeAreaFeatureMeta(
  client: TypedSupabaseClient,
  data: IrbiPayload
): Promise<boolean> {
  const { data: metaRows, error } = await client
    .from("area_feature_meta")
    .select("id, name, kabupaten, properties")
    .eq("layer_key", "irbi2025");

  if (error || !metaRows || metaRows.length === 0) return false;

  const byName = new Map<string, Record<string, unknown>>();
  for (const row of metaRows) {
    const props =
      row.properties && typeof row.properties === "object"
        ? (row.properties as Record<string, unknown>)
        : {};
    byName.set(row.name.toLowerCase(), props);
    byName.set(row.id.toLowerCase(), props);
    if (row.kabupaten) byName.set(row.kabupaten.toLowerCase(), props);
  }

  data.kabupaten_kota = data.kabupaten_kota.map((kab) => {
    const key = (kab.kabupaten_kota || kab.kabupaten_kota_kode || "").toLowerCase();
    const extra = byName.get(key);
    if (!extra) return kab;
    return { ...kab, ...extra, _metaMerged: true };
  });
  return true;
}

async function loadIrbiFromSupabase(
  client: TypedSupabaseClient
): Promise<IrbiPayload | null> {
  const fromDocs =
    (await readDocumentPayload(client, "irbi_documents", IRBI_KEYS)) ??
    (await readDocumentPayload(client, "data_documents", IRBI_KEYS));
  return asIrbiPayload(fromDocs);
}

export async function loadIrbiFixture(): Promise<IrbiPayload> {
  const file = path.join(process.cwd(), "public/fixtures/irbi-2025.json");
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw) as IrbiPayload;
}

export async function loadIrbi(): Promise<IrbiPayload> {
  const loaded = await trySupabaseThenFixture(loadIrbiFromSupabase, loadIrbiFixture, {
    label: "irbi",
    isEmpty: (value) => !value.kabupaten_kota?.length,
  });

  const data: IrbiPayload = {
    ...loaded.data,
    source: loaded.source,
  };

  // Fixture path can still overlay kabupaten scores from area_feature_meta.
  if (loaded.source === "fixture") {
    const client = createServerClient();
    if (client) {
      const merged = await mergeAreaFeatureMeta(client, data);
      if (merged) data.source = "supabase+fixture";
    }
  }

  return data;
}
