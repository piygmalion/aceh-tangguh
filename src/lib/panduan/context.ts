import { kabupatenNamesMatch } from "@/lib/kabupaten-join";
import { fetchPublicApi } from "@/lib/preview/public-api";
import type { PeringatanDiniResponse } from "@/lib/peringatan-dini-types";
import type { WeatherApiResponse } from "@/lib/weather-types";
import type { LiveStats } from "@/lib/types";
import type { DibiAcehResponse } from "@/lib/dibi-types";
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
    fetchedAt: row.fetched_at || payload.metadata.fetched_at || undefined,
  };
}

function summarizePeringatan(
  data: PeringatanDiniResponse,
  kabupaten?: string
): GuideContext["peringatan"] {
  const cuacaRow = kabupaten
    ? data.cuaca.highlights.find((item) => kabupatenNamesMatch(item.kabupaten, kabupaten))
    : data.cuaca.highlights[0];
  const cuacaUnmatched =
    Boolean(kabupaten) && data.cuaca.highlights.length > 0 && !cuacaRow ? kabupaten : undefined;

  const magma = data.magma.source === "unavailable" ? null : data.magma.event;
  const sipongiPoints = kabupaten
    ? data.sipongi.points.filter((item) => kabupatenNamesMatch(item.kabkota, kabupaten))
    : data.sipongi.points;
  const sipongiUnmatched =
    Boolean(kabupaten) && data.sipongi.points.length > 0 && sipongiPoints.length === 0
      ? kabupaten
      : undefined;
  const sipongi = sipongiPoints[0];
  const tatonas = data.tatonas.highlights[0];
  const tatonasValue =
    tatonas && tatonas.value != null ? `${tatonas.value} ${tatonas.satuan}`.trim() : undefined;
  return {
    cuacaEmpty: cuacaUnmatched ? true : data.cuaca.empty,
    cuacaTone: data.cuaca.tone,
    cuacaHighlight: cuacaRow ? `${cuacaRow.kabupaten}: ${cuacaRow.kondisi}` : undefined,
    cuacaUnmatched,
    magmaEmpty: data.magma.source === "unavailable" ? true : data.magma.empty,
    magmaSummary: magma
      ? [magma.magnitude_text, magma.wilayah || magma.gunung_api_terdekat]
          .filter(Boolean)
          .join(" — ")
      : undefined,
    magmaSource: data.magma.source,
    sipongiEmpty: sipongiUnmatched ? true : data.sipongi.empty,
    sipongiCount: sipongiPoints.length,
    sipongiPlace: sipongi?.kabkota,
    sipongiUnmatched,
    tatonasEmpty: data.tatonas.empty,
    tatonasHighlight: tatonas
      ? [tatonas.pos_name, tatonas.sensor, tatonasValue, tatonas.level && `(${tatonas.level})`]
          .filter(Boolean)
          .join(" ")
      : undefined,
    tatonasLevel: tatonas?.level,
    stale: data.cuaca.stale || data.magma.stale || data.sipongi.stale || data.tatonas.stale,
    fetchedAt:
      data.cuaca.fetched_at ||
      data.magma.fetched_at ||
      data.sipongi.fetched_at ||
      data.tatonas.fetched_at ||
      undefined,
  };
}

export async function loadGuideContext(
  match: GuideMatch,
  locale: "id" | "en" = "id",
  keysOverride?: GuideContextKey[]
): Promise<GuideContext> {
  const keys =
    keysOverride ??
    (match.intent === "unknown" ? [] : (CONTEXT_FOR_INTENT[match.intent] ?? []));
  const need = new Set<GuideContextKey>(keys);

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
        ctx.peringatan = summarizePeringatan(data, match.kabupaten);
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
      getJson<{
        counts: Record<string, number>;
        items?: Array<{
          nama?: string;
          kabupaten?: string;
          kecamatan?: string;
          destana_level?: string | null;
        }>;
      }>(`/api/sik/public?${sp}`).then((data) => {
        if (!data?.counts) {
          mark("destana", false);
          ctx.destana = null;
          return;
        }
        ctx.destana = { counts: data.counts };
        if (!match.desa) return;
        const needle = match.desa.toLowerCase();
        const row = (data.items ?? []).find((item) =>
          String(item.nama ?? "").toLowerCase().includes(needle)
        );
        if (!row?.nama) return;
        ctx.destanaDesa = {
          nama: row.nama,
          kabupaten: row.kabupaten ?? ctx.destanaDesa?.kabupaten,
          kecamatan: row.kecamatan ?? ctx.destanaDesa?.kecamatan,
          destanaLevel: row.destana_level ?? ctx.destanaDesa?.destanaLevel,
        };
      })
    );
  }

  if (match.desa && match.intent === "destana") {
    const sp = new URLSearchParams({ nama: match.desa });
    if (match.kabupaten) sp.set("kabupaten", match.kabupaten);
    tasks.push(
      getJson<{
        title?: string;
        kabupaten?: string | null;
        kecamatan?: string | null;
      }>(`/api/profil-desa/desa?${sp}`).then((data) => {
        if (!data?.title) return;
        ctx.destanaDesa = {
          nama: ctx.destanaDesa?.nama ?? data.title,
          kabupaten: ctx.destanaDesa?.kabupaten ?? data.kabupaten ?? undefined,
          kecamatan: ctx.destanaDesa?.kecamatan ?? data.kecamatan ?? undefined,
          destanaLevel: ctx.destanaDesa?.destanaLevel,
        };
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

  if (need.has("pelatihan")) {
    tasks.push(
      getJson<{ items: Array<{ judul?: string; tanggal?: string; status?: string }> }>(
        "/api/sik/public?kind=pelatihan"
      ).then((data) => {
        if (!data || !Array.isArray(data.items)) {
          mark("pelatihan", false);
          ctx.pelatihan = null;
          return;
        }
        ctx.pelatihan = data.items.slice(0, 3).map((row) => ({
          judul: String(row.judul ?? "").trim(),
          tanggal: row.tanggal,
          status: row.status,
        })).filter((row) => row.judul);
      })
    );
  }

  if (need.has("mitra")) {
    tasks.push(
      getJson<{ items: Array<{ judul?: string }> }>("/api/sik/public?kind=mitra").then((data) => {
        if (!data || !Array.isArray(data.items)) {
          mark("mitra", false);
          ctx.mitra = null;
          return;
        }
        ctx.mitra = data.items
          .slice(0, 3)
          .map((row) => ({ judul: String(row.judul ?? "").trim() }))
          .filter((row) => row.judul);
      })
    );
  }

  if (need.has("publikasi")) {
    tasks.push(
      (async () => {
        const [list, kegiatan] = await Promise.all([
          getJson<{ publikasi?: Array<{ title?: string }> }>("/api/publikasi"),
          getJson<{ kegiatan?: Array<{ judul?: string }> }>("/api/publikasi/kegiatan"),
        ]);
        const analisis = (list?.publikasi ?? [])
          .slice(0, 3)
          .map((row) => ({ title: String(row.title ?? "").trim(), channel: "analisis" as const }))
          .filter((row) => row.title);
        const field = (kegiatan?.kegiatan ?? [])
          .slice(0, 2)
          .map((row) => ({ title: String(row.judul ?? "").trim(), channel: "kegiatan" as const }))
          .filter((row) => row.title);
        if (analisis.length === 0 && field.length === 0) {
          mark("publikasi", false);
          ctx.publikasi = null;
          return;
        }
        ctx.publikasi = [...analisis, ...field];
      })()
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
