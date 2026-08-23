import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type IrbiKab = Record<string, unknown> & {
  kabupaten_kota?: string;
  kabupaten_kota_kode?: string;
};

type IrbiPayload = {
  metadata: Record<string, unknown>;
  kabupaten_kota: IrbiKab[];
  source?: string;
};

export async function GET() {
  const file = path.join(process.cwd(), "public/fixtures/irbi-2025.json");
  const raw = await readFile(file, "utf8");
  const data = JSON.parse(raw) as IrbiPayload;

  const supabase = createServerClient();
  if (supabase) {
    const { data: metaRows, error } = await supabase
      .from("area_feature_meta")
      .select("id, name, kabupaten, properties")
      .eq("layer_key", "irbi2025");

    if (!error && metaRows && metaRows.length > 0) {
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
        const key = (
          kab.kabupaten_kota ||
          kab.kabupaten_kota_kode ||
          ""
        ).toLowerCase();
        const extra = byName.get(key);
        if (!extra) return kab;
        return { ...kab, ...extra, _metaMerged: true };
      });
      data.source = "supabase+fixture";
      return NextResponse.json(data);
    }
  }

  data.source = "fixture";
  return NextResponse.json(data);
}
