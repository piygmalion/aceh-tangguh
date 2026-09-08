import { sanitizeSearch } from "@/lib/auth/admin";
import type { AdminProfile } from "@/lib/auth/types";
import { authorizeLaporanList, laporanKabOrFilter } from "@/lib/sik/laporan-scope";
import {
  buildOpsDashboardView,
  emptyOpsCounts,
  opsAccessFromProfile,
  projectOpsRecentRow,
  type OpsAccess,
  type OpsCounts,
  type OpsDashboardView,
  type OpsFeedId,
  type OpsRecentRow,
} from "@/lib/sik/ops-dashboard";
import {
  isDesaRole,
  isKabScoped,
  scopeDesa,
  scopeKabupaten,
  type RoleModuleOverlay,
} from "@/lib/sik/roles";
import type { Database } from "@/lib/supabase/types";

type CountQuery = {
  eq: (column: string, value: string | boolean | number) => CountQuery;
  or: (filter: string) => CountQuery;
  like: (column: string, value: string) => CountQuery;
  in: (column: string, values: string[]) => CountQuery;
  order: (column: string, options: { ascending: boolean }) => CountQuery;
  limit: (n: number) => CountQuery;
} & PromiseLike<{ count: number | null; data: unknown; error: { message?: string } | null }>;

type CountClient = {
  from: (table: string) => {
    select: (columns: string, options?: { count?: "exact"; head?: boolean }) => CountQuery;
  };
};

type ListRow = Record<string, unknown>;

function asQuery(value: unknown): CountQuery {
  return value as CountQuery;
}

async function safeCount(query: CountQuery): Promise<number> {
  try {
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function safeList(query: CountQuery): Promise<ListRow[]> {
  try {
    const { data, error } = await query;
    if (error || !Array.isArray(data)) return [];
    return data.filter((row): row is ListRow => Boolean(row) && typeof row === "object");
  } catch {
    return [];
  }
}

function kabOr(scope: string): string {
  const clean = sanitizeSearch(scope);
  return `kode_kabupaten.eq.${clean},kabupaten.eq.${clean}`;
}

function applyKab(query: CountQuery, scope: string | null): CountQuery {
  if (!scope) return query;
  return query.or(kabOr(scope));
}

function applyDesaCode(
  query: CountQuery,
  filter: { mode: "exact" | "prefix"; kode: string } | null,
): CountQuery {
  if (!filter) return query;
  if (filter.mode === "exact") return query.eq("kode_desa_kelurahan", filter.kode);
  return query.like("kode_desa_kelurahan", `${filter.kode}%`);
}

function desaFilter(profile: AdminProfile): { mode: "exact" | "prefix"; kode: string } | null {
  const desa = sanitizeSearch(scopeDesa(profile) ?? "");
  if (desa) return { mode: "exact", kode: desa };
  if (!isKabScoped(profile)) return null;
  const kab = sanitizeSearch(scopeKabupaten(profile) ?? "");
  if (kab && /^\d{2,6}$/.test(kab)) return { mode: "prefix", kode: kab };
  return null;
}

function pushRecent(target: OpsRecentRow[], module: OpsFeedId, rows: ListRow[]) {
  for (const raw of rows) {
    const row = projectOpsRecentRow(module, raw);
    if (row) target.push(row);
  }
}

export async function loadOpsDashboardView(
  client: CountClient,
  profile: AdminProfile,
  overlay?: RoleModuleOverlay | null,
): Promise<OpsDashboardView> {
  const access = opsAccessFromProfile(profile, overlay);
  const counts: OpsCounts = emptyOpsCounts();
  const recent: OpsRecentRow[] = [];
  const kab = isKabScoped(profile) ? sanitizeSearch(scopeKabupaten(profile) ?? "") || null : null;
  const desa = desaFilter(profile);
  const from = (table: keyof Database["public"]["Tables"] | string) => client.from(String(table));

  const jobs: Array<Promise<void>> = [];

  if (access.moderasi) {
    const list = authorizeLaporanList(profile);
    const canLaporan = !isKabScoped(profile) || list.ok;
    const applyLaporan = (query: CountQuery) => {
      if (canLaporan && list.ok && list.filter) return query.or(laporanKabOrFilter(list.filter));
      return query;
    };
    if (canLaporan) {
      jobs.push(
        (async () => {
          const [
            laporanMasuk,
            laporanDitinjau,
            laporanDisetujui,
            laporanDitolak,
            laporanPerluInfo,
            penangananMasuk,
            penangananDitinjau,
            penangananDisetujui,
            laporanRows,
          ] = await Promise.all([
            safeCount(applyLaporan(asQuery(from("laporan_kejadian").select("id", { count: "exact", head: true })).eq("status", "submitted"))),
            safeCount(applyLaporan(asQuery(from("laporan_kejadian").select("id", { count: "exact", head: true })).eq("status", "in_review"))),
            safeCount(applyLaporan(asQuery(from("laporan_kejadian").select("id", { count: "exact", head: true })).eq("status", "approved"))),
            safeCount(applyLaporan(asQuery(from("laporan_kejadian").select("id", { count: "exact", head: true })).eq("status", "rejected"))),
            safeCount(applyLaporan(asQuery(from("laporan_kejadian").select("id", { count: "exact", head: true })).eq("status", "needs_info"))),
            safeCount(applyLaporan(asQuery(from("laporan_penanganan").select("id", { count: "exact", head: true })).eq("status", "submitted"))),
            safeCount(applyLaporan(asQuery(from("laporan_penanganan").select("id", { count: "exact", head: true })).eq("status", "in_review"))),
            safeCount(applyLaporan(asQuery(from("laporan_penanganan").select("id", { count: "exact", head: true })).eq("status", "approved"))),
            safeList(
              applyLaporan(asQuery(from("laporan_kejadian").select("id, nomor_laporan, jenis_bencana, status, kabupaten_kota, submitted_at")))
                .order("submitted_at", { ascending: false })
                .limit(6),
            ),
          ]);
          counts.laporanMasuk = laporanMasuk;
          counts.laporanDitinjau = laporanDitinjau;
          counts.laporanDisetujui = laporanDisetujui;
          counts.laporanDitolak = laporanDitolak;
          counts.laporanPerluInfo = laporanPerluInfo;
          counts.penangananMasuk = penangananMasuk;
          counts.penangananDitinjau = penangananDitinjau;
          counts.penangananDisetujui = penangananDisetujui;
          pushRecent(recent, "moderasi", laporanRows);
        })(),
      );
    }
  }

  if (access.kejadian) {
    jobs.push(
      (async () => {
        const [kejadianOps, kejadianDarurat, calonDraf, kejadianRows, calonRows] = await Promise.all([
          safeCount(applyKab(asQuery(from("kejadian_operasi").select("id", { count: "exact", head: true })), kab)),
          safeCount(applyKab(asQuery(from("kejadian_operasi").select("id", { count: "exact", head: true })).eq("status_darurat", true), kab)),
          safeCount(applyKab(asQuery(from("overlay_calon_kejadian").select("id", { count: "exact", head: true })).eq("status", "draf"), kab)),
          safeList(
            applyKab(
              asQuery(from("kejadian_operasi").select("id, nama_kejadian, jenis_bencana, kabupaten, status, waktu_kejadian")),
              kab,
            )
              .order("waktu_kejadian", { ascending: false })
              .limit(8),
          ),
          safeList(
            applyKab(
              asQuery(from("overlay_calon_kejadian").select("id, nama_sinyal, status, kabupaten, waktu_sinyal, created_at")),
              kab,
            )
              .order("created_at", { ascending: false })
              .limit(8),
          ),
        ]);
        counts.kejadianOps = kejadianOps;
        counts.kejadianDarurat = kejadianDarurat;
        counts.calonDraf = calonDraf;
        pushRecent(recent, "kejadian", kejadianRows);
        pushRecent(
          recent,
          "kejadian",
          calonRows.map((row) => ({
            ...row,
            waktu_kejadian: typeof row.waktu_sinyal === "string" ? row.waktu_sinyal : row.created_at,
          })),
        );
      })(),
    );
  }

  if (access.logistik) {
    jobs.push(
      (async () => {
        let kejadianIds: string[] = [];
        if (kab) {
          const scoped = await safeList(
            applyKab(asQuery(from("kejadian_operasi").select("id")), kab).limit(200),
          );
          kejadianIds = scoped.map((row) => String(row.id ?? "")).filter(Boolean);
        }
        const distFilter = (query: CountQuery) => {
          if (!kab) return query;
          if (kejadianIds.length === 0) return query.eq("kejadian_id", "__none__");
          return query.in("kejadian_id", kejadianIds);
        };
        const [personil, peralatan, kebutuhan, distPersonil, distPeralatan, distKebutuhan, personilRows, alatRows] =
          await Promise.all([
            safeCount(applyKab(asQuery(from("personil").select("id", { count: "exact", head: true })), kab)),
            safeCount(applyKab(asQuery(from("peralatan").select("id", { count: "exact", head: true })), kab)),
            safeCount(applyKab(asQuery(from("kebutuhan_dasar").select("id", { count: "exact", head: true })), kab)),
            safeCount(distFilter(asQuery(from("distribusi_personil").select("id", { count: "exact", head: true })))),
            safeCount(distFilter(asQuery(from("distribusi_peralatan").select("id", { count: "exact", head: true })))),
            safeCount(distFilter(asQuery(from("distribusi_kebutuhan").select("id", { count: "exact", head: true })))),
            safeList(
              applyKab(asQuery(from("personil").select("id, nama, status, kabupaten, created_at")), kab)
                .order("created_at", { ascending: false })
                .limit(6),
            ),
            safeList(
              applyKab(asQuery(from("peralatan").select("id, nama, kondisi, kabupaten, created_at")), kab)
                .order("created_at", { ascending: false })
                .limit(6),
            ),
          ]);
        counts.personil = personil;
        counts.peralatan = peralatan;
        counts.kebutuhan = kebutuhan;
        counts.distPersonil = distPersonil;
        counts.distPeralatan = distPeralatan;
        counts.distKebutuhan = distKebutuhan;
        pushRecent(recent, "logistik", personilRows);
        pushRecent(recent, "logistik", alatRows);
      })(),
    );
  }

  if (access.destana) {
    const allowDestana = !isDesaRole(profile) && !isKabScoped(profile) ? true : Boolean(desa);
    if (allowDestana) {
      jobs.push(
        (async () => {
          const [destanaSi, destanaAktivitas, destanaAktivitasSelesai, pkdTugas, pkdTugasSelesai, aktivitasRows] =
            await Promise.all([
              safeCount(applyDesaCode(asQuery(from("destana_si").select("kode_desa_kelurahan", { count: "exact", head: true })), desa)),
              safeCount(applyDesaCode(asQuery(from("destana_aktivitas").select("id", { count: "exact", head: true })), desa)),
              safeCount(
                applyDesaCode(asQuery(from("destana_aktivitas").select("id", { count: "exact", head: true })).eq("status", "selesai"), desa),
              ),
              safeCount(applyDesaCode(asQuery(from("pkd_tugas").select("id", { count: "exact", head: true })), desa)),
              safeCount(applyDesaCode(asQuery(from("pkd_tugas").select("id", { count: "exact", head: true })).eq("status", "selesai"), desa)),
              safeList(
                applyDesaCode(
                  asQuery(from("destana_aktivitas").select("id, kode_desa_kelurahan, kode_aktivitas, status, updated_at")),
                  desa,
                )
                  .order("updated_at", { ascending: false })
                  .limit(6),
              ),
            ]);
          counts.destanaSi = destanaSi;
          counts.destanaAktivitas = destanaAktivitas;
          counts.destanaAktivitasSelesai = destanaAktivitasSelesai;
          counts.pkdTugas = pkdTugas;
          counts.pkdTugasSelesai = pkdTugasSelesai;
          pushRecent(recent, "destana", aktivitasRows);
        })(),
      );
    }
  }

  if (access.rehab) {
    jobs.push(
      (async () => {
        const [rehabKebutuhan, rehabMonitoring, rehabPenerima, rehabRows] = await Promise.all([
          safeCount(applyKab(asQuery(from("rehab_kebutuhan").select("id", { count: "exact", head: true })), kab)),
          safeCount(applyKab(asQuery(from("rehab_monitoring").select("id", { count: "exact", head: true })), kab)),
          safeCount(asQuery(from("rehab_penerima").select("id", { count: "exact", head: true }))),
          safeList(
            applyKab(asQuery(from("rehab_kebutuhan").select("id, status, kabupaten, created_at")), kab)
              .order("created_at", { ascending: false })
              .limit(6),
          ),
        ]);
        counts.rehabKebutuhan = rehabKebutuhan;
        counts.rehabMonitoring = rehabMonitoring;
        counts.rehabPenerima = isKabScoped(profile) ? 0 : rehabPenerima;
        pushRecent(recent, "rehab", rehabRows);
      })(),
    );
  }

  if (access.disabilitas) {
    jobs.push(
      (async () => {
        counts.disabilitas = await safeCount(
          applyKab(asQuery(from("disabilitas_agregat").select("id", { count: "exact", head: true })), kab),
        );
      })(),
    );
  }

  if (access.publikCms) {
    jobs.push(
      (async () => {
        const [nomorPenting, pelatihan, permintaanPelatihan] = await Promise.all([
          safeCount(asQuery(from("nomor_penting").select("id", { count: "exact", head: true }))),
          safeCount(asQuery(from("pelatihan").select("id", { count: "exact", head: true }))),
          safeCount(asQuery(from("permintaan_pelatihan").select("id", { count: "exact", head: true }))),
        ]);
        counts.nomorPenting = nomorPenting;
        counts.pelatihan = pelatihan;
        counts.permintaanPelatihan = permintaanPelatihan;
      })(),
    );
  }

  if (access.master) {
    jobs.push(
      (async () => {
        const [instansi, pengungsian] = await Promise.all([
          safeCount(applyKab(asQuery(from("instansi").select("id", { count: "exact", head: true })), kab)),
          safeCount(applyKab(asQuery(from("tempat_pengungsian").select("id", { count: "exact", head: true })), kab)),
        ]);
        counts.instansi = instansi;
        counts.pengungsian = pengungsian;
      })(),
    );
  }

  if (access.dailyBrief) {
    jobs.push(
      (async () => {
        const [dailyBriefActive, dailyBriefs] = await Promise.all([
          safeCount(asQuery(from("daily_brief_subscribers").select("id", { count: "exact", head: true })).eq("status", "active")),
          safeCount(asQuery(from("daily_briefs").select("id", { count: "exact", head: true }))),
        ]);
        counts.dailyBriefActive = dailyBriefActive;
        counts.dailyBriefs = dailyBriefs;
      })(),
    );
  }

  await Promise.all(jobs);
  recent.sort((a, b) => (a.when < b.when ? 1 : a.when > b.when ? -1 : 0));
  return buildOpsDashboardView(counts, recent.slice(0, 12), access);
}

export function emptyOpsDashboardView(access: OpsAccess): OpsDashboardView {
  return buildOpsDashboardView(emptyOpsCounts(), [], access);
}
