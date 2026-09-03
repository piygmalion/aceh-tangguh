import { kabupatenNamesMatch } from "@/lib/kabupaten-join";
import { fetchPublicApi } from "@/lib/preview/public-api";
import type { PeringatanDiniResponse } from "@/lib/peringatan-dini-types";
import type { WeatherApiResponse } from "@/lib/weather-types";
import type { LiveStats } from "@/lib/types";
import type { DibiAcehResponse } from "@/lib/dibi-types";
import type { AnggaranApiResponse } from "@/lib/anggaran-types";
import type { IrbiSummaryPayload } from "@/lib/irbi-by-kab";
import type { KrbPayload } from "@/lib/krb-filter";
import { CONTEXT_FOR_INTENT } from "./intents";
import type {
  GuideContext,
  GuideContextKey,
  GuideKejadianItem,
  GuideMatch,
  GuideNomorItem,
} from "./types";

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetchPublicApi(path);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function pickWeather(
  payload: WeatherApiResponse | null,
  kabupaten?: string,
  locale: "id" | "en" = "id"
): GuideContext["weather"] {
  if (!payload?.kabupaten_kota?.length) return null;
  const row = kabupaten
    ? payload.kabupaten_kota.find((item) =>
        kabupatenNamesMatch(item.kabupaten_kota, kabupaten)
      )
    : payload.kabupaten_kota[0];
  if (!row) return null;
  const desc =
    locale === "en"
      ? row.current.weather_desc_en || row.current.weather_desc_id
      : row.current.weather_desc_id || row.current.weather_desc_en;
  return {
    kabupaten: row.kabupaten_kota,
    desc,
    tempC: Number.isFinite(row.current.temperature_c) ? row.current.temperature_c : null,
    fetchedAt: row.fetched_at || payload.metadata.fetched_at,
  };
}

function summarizePeringatan(data: PeringatanDiniResponse): GuideContext["peringatan"] {
  const cuaca = data.cuaca.highlights[0];
  const magma = data.magma.event;
  const sipongi = data.sipongi.points[0];
  return {
    cuacaEmpty: data.cuaca.empty,
    cuacaTone: data.cuaca.tone,
    cuacaHighlight: cuaca
      ? `${cuaca.kabupaten}: ${cuaca.kondisi}`
      : undefined,
    magmaEmpty: data.magma.empty,
    magmaSummary: magma
      ? [magma.magnitude_text, magma.wilayah || magma.gunung_api_terdekat]
          .filter(Boolean)
          .join(" — ")
      : undefined,
    sipongiEmpty: data.sipongi.empty,
    sipongiCount: data.sipongi.points.length,
    sipongiPlace: sipongi?.kabkota,
    stale: data.cuaca.stale || data.magma.stale || data.sipongi.stale,
    fetchedAt: data.cuaca.fetched_at || data.magma.fetched_at || data.sipongi.fetched_at || undefined,
  };
}

export async function loadGuideContext(
  match: GuideMatch,
  locale: "id" | "en" = "id"
): Promise<GuideContext> {
  const keys =
    match.intent === "unknown" ? [] : CONTEXT_FOR_INTENT[match.intent];
  const need = new Set<GuideContextKey>(keys);
  if (match.intent === "kejadian" && !match.kabupaten && !match.jenis && !match.year) {
    need.delete("kejadian");
  }

  const ctx: GuideContext = { failed: [] };
  const tasks: Promise<void>[] = [];

  const mark = (key: GuideContextKey, ok: boolean) => {
    if (!ok) ctx.failed.push(key);
  };

  if (need.has("peringatan")) {
    tasks.push(
      getJson<PeringatanDiniResponse>("/api/peringatan-dini").then((data) => {
        if (!data) {
          mark("peringatan", false);
          ctx.peringatan = null;
          return;
        }
        ctx.peringatan = summarizePeringatan(data);
      })
    );
  }

  if (need.has("weather")) {
    tasks.push(
      getJson<WeatherApiResponse>("/api/weather").then((data) => {
        if (!data) {
          mark("weather", false);
          ctx.weather = null;
          return;
        }
        ctx.weather = pickWeather(data, match.kabupaten, locale);
        if (match.kabupaten && !ctx.weather) ctx.weather = null;
      })
    );
  }

  if (need.has("liveStats")) {
    tasks.push(
      getJson<LiveStats & { source?: string }>("/api/stats/live").then((data) => {
        if (!data || typeof data.activeIncidents !== "number") {
          mark("liveStats", false);
          ctx.liveStats = null;
          return;
        }
        ctx.liveStats = {
          activeIncidents: data.activeIncidents,
          reportsLast24h: data.reportsLast24h,
          updatedAt: data.updatedAt,
        };
      })
    );
  }

  if (need.has("sikStats")) {
    const year = String(match.year ?? new Date().getFullYear());
    const sp = new URLSearchParams({ kind: "stats", tahun: year });
    if (match.kabupaten) sp.set("kabupaten", match.kabupaten);
    if (match.jenis) sp.set("jenis", match.jenis);
    tasks.push(
      getJson<{
        total: number;
        year: number;
        byJenis: { jenis: string; count: number }[];
      }>(`/api/sik/public?${sp}`).then((data) => {
        if (!data || typeof data.total !== "number") {
          mark("sikStats", false);
          ctx.sikStats = null;
          return;
        }
        ctx.sikStats = {
          total: data.total,
          year: data.year,
          byJenis: Array.isArray(data.byJenis) ? data.byJenis.slice(0, 5) : [],
        };
      })
    );
  }

  if (need.has("nomor")) {
    tasks.push(
      getJson<{ items: GuideNomorItem[] }>("/api/sik/public?kind=nomor-penting").then(
        (data) => {
          if (!data || !Array.isArray(data.items)) {
            mark("nomor", false);
            ctx.nomor = null;
            return;
          }
          ctx.nomor = data.items.slice(0, 6);
        }
      )
    );
  }

  if (need.has("destana")) {
    const sp = new URLSearchParams({ kind: "destana" });
    if (match.kabupaten) sp.set("kabupaten", match.kabupaten);
    tasks.push(
      getJson<{ counts: Record<string, number> }>(`/api/sik/public?${sp}`).then((data) => {
        if (!data?.counts) {
          mark("destana", false);
          ctx.destana = null;
          return;
        }
        ctx.destana = { counts: data.counts };
      })
    );
  }

  if (need.has("kejadian")) {
    const sp = new URLSearchParams({ page: "1", pageSize: "5" });
    if (match.kabupaten) sp.set("kabupaten", match.kabupaten);
    if (match.jenis) sp.set("q", match.jenis);
    if (match.year) {
      sp.set("from", `${match.year}-01-01`);
      sp.set("to", `${match.year}-12-31`);
    }
    tasks.push(
      getJson<{
        total: number;
        items: Array<{
          id: string;
          jenis_bencana: string;
          hari_tanggal?: string;
          lokasi?: { kabupaten?: string; kabupaten_kota?: string };
        }>;
      }>(`/api/kejadian?${sp}`).then((data) => {
        if (!data || typeof data.total !== "number") {
          mark("kejadian", false);
          ctx.kejadian = null;
          return;
        }
        const items: GuideKejadianItem[] = (data.items ?? []).slice(0, 5).map((row) => ({
          id: row.id,
          jenis: row.jenis_bencana,
          kabupaten: row.lokasi?.kabupaten || row.lokasi?.kabupaten_kota,
          tanggal: row.hari_tanggal,
        }));
        ctx.kejadian = { total: data.total, items };
      })
    );
  }

  if (need.has("dibi")) {
    tasks.push(
      getJson<DibiAcehResponse>("/api/dibi/aceh").then((data) => {
        if (!data?.totals || !data.metadata) {
          mark("dibi", false);
          ctx.dibi = null;
          return;
        }
        const top = [...(data.by_kategori ?? [])].sort((a, b) => b.kejadian - a.kejadian)[0];
        ctx.dibi = {
          kejadian: data.totals.kejadian,
          yearFrom: data.metadata.year_from,
          yearTo: data.metadata.year_to,
          topKategori: top?.kategori_bencana,
          meninggal: data.totals.meninggal,
          fetchedAt: data.metadata.fetched_at,
        };
      })
    );
  }

  if (need.has("anggaran")) {
    tasks.push(
      getJson<AnggaranApiResponse>("/api/anggaran").then((data) => {
        const meta = data?.analisis?.metadata;
        if (!meta || typeof meta.total_anggaran_rp !== "number") {
          mark("anggaran", false);
          ctx.anggaran = null;
          return;
        }
        ctx.anggaran = {
          tahun: meta.tahun_anggaran,
          totalRp: meta.total_anggaran_rp,
          kegiatan: meta.total_kegiatan,
        };
      })
    );
  }

  if (need.has("irbi")) {
    tasks.push(
      getJson<IrbiSummaryPayload & { metadata?: Record<string, unknown> }>("/api/irbi").then(
        (data) => {
          const rows = data?.kabupaten_kota;
          const meta = data?.metadata ?? {};
          if (!Array.isArray(rows)) {
            mark("irbi", false);
            ctx.irbi = null;
            return;
          }
          const row = match.kabupaten
            ? rows.find((item) => kabupatenNamesMatch(item.kabupaten_kota, match.kabupaten))
            : undefined;
          ctx.irbi = {
            kab: row?.kabupaten_kota,
            kelas: row?.kelas_risiko,
            irb: row?.irb_2025,
            provinsiKelas:
              typeof meta.kelas_risiko_provinsi === "string"
                ? meta.kelas_risiko_provinsi
                : undefined,
            provinsiIrb:
              typeof meta.nilai_irb_provinsi === "number" ? meta.nilai_irb_provinsi : undefined,
          };
        }
      )
    );
  }

  if (need.has("krb")) {
    const sp = new URLSearchParams();
    if (match.kabupaten) sp.set("kabupaten", match.kabupaten);
    const suffix = sp.toString() ? `?${sp}` : "";
    tasks.push(
      getJson<KrbPayload>(`/api/krb${suffix}`).then((data) => {
        if (!data) {
          mark("krb", false);
          ctx.krb = null;
          return;
        }
        ctx.krb = {
          kawasanCount: Array.isArray(data.kawasan) ? data.kawasan.length : undefined,
          kabupaten: match.kabupaten,
        };
      })
    );
  }

  await Promise.all(tasks);
  return ctx;
}
