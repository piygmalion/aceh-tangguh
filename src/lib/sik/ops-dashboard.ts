import type { AdminProfile } from "@/lib/auth/types";
import { canAccessModule, type RoleModuleOverlay } from "@/lib/sik/roles";

export type OpsAccess = {
  overview: boolean;
  moderasi: boolean;
  kejadian: boolean;
  logistik: boolean;
  master: boolean;
  destana: boolean;
  rehab: boolean;
  disabilitas: boolean;
  publikCms: boolean;
  dailyBrief: boolean;
};

export type OpsCounts = {
  laporanMasuk: number;
  laporanDitinjau: number;
  laporanDisetujui: number;
  laporanDitolak: number;
  laporanPerluInfo: number;
  penangananMasuk: number;
  penangananDitinjau: number;
  penangananDisetujui: number;
  kejadianOps: number;
  kejadianDarurat: number;
  calonDraf: number;
  personil: number;
  peralatan: number;
  kebutuhan: number;
  distPersonil: number;
  distPeralatan: number;
  distKebutuhan: number;
  destanaSi: number;
  destanaAktivitas: number;
  destanaAktivitasSelesai: number;
  pkdTugas: number;
  pkdTugasSelesai: number;
  rehabKebutuhan: number;
  rehabMonitoring: number;
  rehabPenerima: number;
  disabilitas: number;
  nomorPenting: number;
  pelatihan: number;
  permintaanPelatihan: number;
  instansi: number;
  pengungsian: number;
  dailyBriefActive: number;
  dailyBriefs: number;
};

export type OpsLifecycleKey = "incoming" | "review" | "approved" | "ops" | "logistics";

export type OpsFeedId =
  | "moderasi"
  | "kejadian"
  | "logistik"
  | "destana"
  | "rehab"
  | "disabilitas"
  | "publikCms"
  | "master"
  | "dailyBrief";

export type OpsFeedHref =
  | "/admin/moderasi"
  | "/admin/sik/kejadian"
  | "/admin/sik/logistik"
  | "/admin/sik/destana"
  | "/admin/sik/rehab"
  | "/admin/sik/disabilitas"
  | "/admin/sik/publik"
  | "/admin/sik/master"
  | "/admin/daily-brief";

export const OPS_FEED_HREFS: Record<OpsFeedId, OpsFeedHref> = {
  moderasi: "/admin/moderasi",
  kejadian: "/admin/sik/kejadian",
  logistik: "/admin/sik/logistik",
  destana: "/admin/sik/destana",
  rehab: "/admin/sik/rehab",
  disabilitas: "/admin/sik/disabilitas",
  publikCms: "/admin/sik/publik",
  master: "/admin/sik/master",
  dailyBrief: "/admin/daily-brief",
};

export type OpsMetric = { key: string; value: number };

export type OpsFeed = {
  id: OpsFeedId;
  href: OpsFeedHref;
  volume: number;
  progress: number;
  metrics: OpsMetric[];
};

export type OpsLifecycleStep = {
  key: OpsLifecycleKey;
  value: number;
  href: OpsFeedHref;
};

export type OpsRecentRow = {
  id: string;
  module: OpsFeedId;
  title: string;
  meta: string;
  status: string;
  when: string;
};

export type OpsLeaderboardRow = {
  id: OpsFeedId;
  volume: number;
};

export type OpsCoverage = {
  modulesVisible: number;
  modulesWithData: number;
  queue: number;
  incidents: number;
  logisticsBound: number;
};

export type OpsDashboardView = {
  coverage: OpsCoverage;
  lifecycle: OpsLifecycleStep[];
  feeds: OpsFeed[];
  leaderboard: OpsLeaderboardRow[];
  recent: OpsRecentRow[];
};

const BLOCKED_FIELD = /(^|_)enc$|phone|nik|jawaban_json|pelapor_id|pii/i;

export function emptyOpsCounts(): OpsCounts {
  return {
    laporanMasuk: 0,
    laporanDitinjau: 0,
    laporanDisetujui: 0,
    laporanDitolak: 0,
    laporanPerluInfo: 0,
    penangananMasuk: 0,
    penangananDitinjau: 0,
    penangananDisetujui: 0,
    kejadianOps: 0,
    kejadianDarurat: 0,
    calonDraf: 0,
    personil: 0,
    peralatan: 0,
    kebutuhan: 0,
    distPersonil: 0,
    distPeralatan: 0,
    distKebutuhan: 0,
    destanaSi: 0,
    destanaAktivitas: 0,
    destanaAktivitasSelesai: 0,
    pkdTugas: 0,
    pkdTugasSelesai: 0,
    rehabKebutuhan: 0,
    rehabMonitoring: 0,
    rehabPenerima: 0,
    disabilitas: 0,
    nomorPenting: 0,
    pelatihan: 0,
    permintaanPelatihan: 0,
    instansi: 0,
    pengungsian: 0,
    dailyBriefActive: 0,
    dailyBriefs: 0,
  };
}

export function progressRatio(done: number, total: number): number {
  if (!Number.isFinite(done) || !Number.isFinite(total) || total <= 0 || done <= 0) return 0;
  return Math.min(1, done / total);
}

export function isBlockedOpsField(name: string): boolean {
  return BLOCKED_FIELD.test(name);
}

export function opsAccessFromProfile(
  profile: AdminProfile | null,
  overlay?: RoleModuleOverlay | null,
): OpsAccess {
  return {
    overview: canAccessModule(profile, "overview", overlay),
    moderasi: canAccessModule(profile, "moderasi", overlay),
    kejadian: canAccessModule(profile, "kejadian", overlay),
    logistik: canAccessModule(profile, "logistik", overlay),
    master: canAccessModule(profile, "master", overlay),
    destana: canAccessModule(profile, "destana", overlay),
    rehab: canAccessModule(profile, "rehab", overlay),
    disabilitas: canAccessModule(profile, "disabilitas", overlay),
    publikCms: canAccessModule(profile, "publikCms", overlay),
    dailyBrief: canAccessModule(profile, "dailyBrief", overlay),
  };
}

function n(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function projectOpsRecentRow(
  module: OpsFeedId,
  raw: Record<string, unknown>,
): OpsRecentRow | null {
  const id = asText(raw.id);
  if (!id) return null;
  const title =
    asText(raw.nama) ||
    asText(raw.nama_kejadian) ||
    asText(raw.nama_sinyal) ||
    asText(raw.nomor_laporan) ||
    asText(raw.judul) ||
    asText(raw.kode_aktivitas) ||
    id;
  const meta = [asText(raw.kabupaten), asText(raw.kabupaten_kota), asText(raw.jenis_bencana), asText(raw.kode_desa_kelurahan)]
    .filter(Boolean)
    .join(" · ");
  const status = asText(raw.status) || asText(raw.kondisi);
  const when =
    asText(raw.waktu_kejadian) ||
    asText(raw.submitted_at) ||
    asText(raw.updated_at) ||
    asText(raw.created_at);
  const row: OpsRecentRow = { id, module, title, meta, status, when };
  if (isBlockedOpsField(JSON.stringify(row))) return { ...row, title: id, meta: "", status: "" };
  return row;
}

function buildFeeds(counts: OpsCounts, access: OpsAccess): OpsFeed[] {
  const feeds: OpsFeed[] = [];
  const laporanAll =
    n(counts.laporanMasuk) +
    n(counts.laporanDitinjau) +
    n(counts.laporanDisetujui) +
    n(counts.laporanDitolak) +
    n(counts.laporanPerluInfo) +
    n(counts.penangananMasuk) +
    n(counts.penangananDitinjau) +
    n(counts.penangananDisetujui);
  const stock = n(counts.personil) + n(counts.peralatan) + n(counts.kebutuhan);
  const distributed = n(counts.distPersonil) + n(counts.distPeralatan) + n(counts.distKebutuhan);

  if (access.moderasi) {
    feeds.push({
      id: "moderasi",
      href: OPS_FEED_HREFS.moderasi,
      volume: laporanAll,
      progress: progressRatio(n(counts.laporanDisetujui) + n(counts.penangananDisetujui), laporanAll),
      metrics: [
        { key: "incoming", value: n(counts.laporanMasuk) + n(counts.penangananMasuk) },
        { key: "review", value: n(counts.laporanDitinjau) + n(counts.penangananDitinjau) },
        { key: "approved", value: n(counts.laporanDisetujui) + n(counts.penangananDisetujui) },
      ],
    });
  }
  if (access.kejadian) {
    const ops = n(counts.kejadianOps);
    const calon = n(counts.calonDraf);
    feeds.push({
      id: "kejadian",
      href: OPS_FEED_HREFS.kejadian,
      volume: ops + calon,
      progress: progressRatio(ops, ops + calon),
      metrics: [
        { key: "ops", value: ops },
        { key: "calon", value: calon },
        { key: "darurat", value: n(counts.kejadianDarurat) },
      ],
    });
  }
  if (access.logistik) {
    feeds.push({
      id: "logistik",
      href: OPS_FEED_HREFS.logistik,
      volume: stock + distributed,
      progress: progressRatio(distributed, stock),
      metrics: [
        { key: "stock", value: stock },
        { key: "distributed", value: distributed },
        { key: "personil", value: n(counts.personil) },
        { key: "peralatan", value: n(counts.peralatan) },
        { key: "kebutuhan", value: n(counts.kebutuhan) },
      ],
    });
  }
  if (access.destana) {
    const aktivitas = n(counts.destanaAktivitas);
    const pkd = n(counts.pkdTugas);
    feeds.push({
      id: "destana",
      href: OPS_FEED_HREFS.destana,
      volume: n(counts.destanaSi) + aktivitas + pkd,
      progress: progressRatio(
        n(counts.destanaAktivitasSelesai) + n(counts.pkdTugasSelesai),
        aktivitas + pkd,
      ),
      metrics: [
        { key: "programs", value: n(counts.destanaSi) },
        { key: "aktivitas", value: aktivitas },
        { key: "pkd", value: pkd },
      ],
    });
  }
  if (access.rehab) {
    feeds.push({
      id: "rehab",
      href: OPS_FEED_HREFS.rehab,
      volume: n(counts.rehabKebutuhan) + n(counts.rehabMonitoring) + n(counts.rehabPenerima),
      progress: progressRatio(n(counts.rehabMonitoring), n(counts.rehabKebutuhan)),
      metrics: [
        { key: "rehab", value: n(counts.rehabKebutuhan) },
        { key: "monitoring", value: n(counts.rehabMonitoring) },
        { key: "penerima", value: n(counts.rehabPenerima) },
      ],
    });
  }
  if (access.disabilitas) {
    feeds.push({
      id: "disabilitas",
      href: OPS_FEED_HREFS.disabilitas,
      volume: n(counts.disabilitas),
      progress: progressRatio(n(counts.disabilitas), n(counts.disabilitas)),
      metrics: [{ key: "disabilitas", value: n(counts.disabilitas) }],
    });
  }
  if (access.publikCms) {
    const volume = n(counts.nomorPenting) + n(counts.pelatihan) + n(counts.permintaanPelatihan);
    feeds.push({
      id: "publikCms",
      href: OPS_FEED_HREFS.publikCms,
      volume,
      progress: progressRatio(n(counts.pelatihan), volume),
      metrics: [
        { key: "nomor", value: n(counts.nomorPenting) },
        { key: "pelatihan", value: n(counts.pelatihan) },
        { key: "permintaan", value: n(counts.permintaanPelatihan) },
      ],
    });
  }
  if (access.master) {
    feeds.push({
      id: "master",
      href: OPS_FEED_HREFS.master,
      volume: n(counts.instansi) + n(counts.pengungsian),
      progress: progressRatio(n(counts.pengungsian), n(counts.instansi) + n(counts.pengungsian)),
      metrics: [
        { key: "instansi", value: n(counts.instansi) },
        { key: "pengungsian", value: n(counts.pengungsian) },
      ],
    });
  }
  if (access.dailyBrief) {
    feeds.push({
      id: "dailyBrief",
      href: OPS_FEED_HREFS.dailyBrief,
      volume: n(counts.dailyBriefActive) + n(counts.dailyBriefs),
      progress: progressRatio(n(counts.dailyBriefs), n(counts.dailyBriefActive) + n(counts.dailyBriefs)),
      metrics: [
        { key: "subscribers", value: n(counts.dailyBriefActive) },
        { key: "briefs", value: n(counts.dailyBriefs) },
      ],
    });
  }
  return feeds;
}

function buildLifecycle(counts: OpsCounts, access: OpsAccess): OpsLifecycleStep[] {
  const steps: OpsLifecycleStep[] = [];
  if (access.moderasi) {
    steps.push({
      key: "incoming",
      value: n(counts.laporanMasuk) + n(counts.penangananMasuk),
      href: OPS_FEED_HREFS.moderasi,
    });
    steps.push({
      key: "review",
      value: n(counts.laporanDitinjau) + n(counts.penangananDitinjau),
      href: OPS_FEED_HREFS.moderasi,
    });
    steps.push({
      key: "approved",
      value: n(counts.laporanDisetujui) + n(counts.penangananDisetujui),
      href: OPS_FEED_HREFS.moderasi,
    });
  }
  if (access.kejadian) {
    steps.push({ key: "ops", value: n(counts.kejadianOps), href: OPS_FEED_HREFS.kejadian });
  }
  if (access.logistik) {
    steps.push({
      key: "logistics",
      value: n(counts.distPersonil) + n(counts.distPeralatan) + n(counts.distKebutuhan),
      href: OPS_FEED_HREFS.logistik,
    });
  }
  return steps;
}

export function buildOpsDashboardView(
  counts: OpsCounts,
  recent: OpsRecentRow[],
  access: OpsAccess,
): OpsDashboardView {
  const feeds = buildFeeds(counts, access);
  const lifecycle = buildLifecycle(counts, access);
  const queue = access.moderasi
    ? n(counts.laporanMasuk) +
      n(counts.penangananMasuk) +
      n(counts.laporanDitinjau) +
      n(counts.penangananDitinjau) +
      n(counts.laporanPerluInfo)
    : 0;
  return {
    coverage: {
      modulesVisible: feeds.length,
      modulesWithData: feeds.filter((feed) => feed.volume > 0).length,
      queue,
      incidents: access.kejadian ? n(counts.kejadianOps) : 0,
      logisticsBound: access.logistik
        ? n(counts.distPersonil) + n(counts.distPeralatan) + n(counts.distKebutuhan)
        : 0,
    },
    lifecycle,
    feeds,
    leaderboard: feeds
      .map((feed) => ({ id: feed.id, volume: feed.volume }))
      .sort((a, b) => b.volume - a.volume),
    recent,
  };
}
