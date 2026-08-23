import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { fetchProfilDesaRows } from "@/lib/profil-desa-server";
import {
  badgeFromMetrics,
  metricsFromRows,
  summarizeRows,
  type KabupatenProfilResponse,
} from "@/lib/profil-desa";
import type { ProfilDesaRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const kodeKabupaten = sp.get("kode_kabupaten")?.trim() || "";
  const kabupaten = sp.get("kabupaten")?.trim() || "";

  if (!kodeKabupaten && !kabupaten) {
    return NextResponse.json(
      { error: "Provide kabupaten or kode_kabupaten" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { rows, error } = kodeKabupaten
    ? await fetchProfilDesaRows(supabase, {
        kind: "kode_kabupaten",
        value: kodeKabupaten,
      })
    : await fetchProfilDesaRows(supabase, { kind: "kabupaten", value: kabupaten });

  if (error) {
    return NextResponse.json({ error }, { status: 502 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const title =
    rows[0].kabupaten?.trim() || kabupaten || kodeKabupaten || "Kabupaten";
  const summary = summarizeRows(rows, "kabupaten", title);

  const byKec = new Map<string, ProfilDesaRow[]>();
  for (const row of rows) {
    const key = (row.kecamatan ?? row.kode_kecamatan ?? "—").trim() || "—";
    const list = byKec.get(key) ?? [];
    list.push(row);
    byKec.set(key, list);
  }

  const kecamatan_list = [...byKec.entries()]
    .map(([name, kecRows]) => {
      const metrics = metricsFromRows(kecRows);
      return {
        kecamatan: name,
        kode_kecamatan: kecRows[0]?.kode_kecamatan ?? null,
        desa_count: kecRows.length,
        badge: badgeFromMetrics(
          metrics,
          kecRows.map((r) => r.kondisi_kode)
        ),
        total_rumah_rusak: metrics.total_rumah_rusak,
      };
    })
    .sort((a, b) => {
      const da = a.total_rumah_rusak ?? -1;
      const db = b.total_rumah_rusak ?? -1;
      if (db !== da) return db - da;
      return a.kecamatan.localeCompare(b.kecamatan, "id");
    });

  const body: KabupatenProfilResponse = {
    ...summary,
    kecamatan_list,
    source: "supabase",
  };
  return NextResponse.json(body);
}
