/**
 * Ambang kesegaran K3 + D5.
 * Status: usulan, belum dikunci. Baru dikunci setelah OK Data.
 * Fungsi ini murni: tidak membuka jaringan, tidak membaca secret, tidak menulis basis data.
 */

export const KESEGARAN_STATUS_USULAN = "usulan, belum dikunci" as const;

export type KesegaranAmbang = {
  weatherFetchedMaxMs: number;
  overlayRefreshMaxMs: number;
  dibiFetchedMaxMs: number;
};

export const KESEGARAN_USULAN_DATA: KesegaranAmbang & {
  status: typeof KESEGARAN_STATUS_USULAN;
} = {
  status: KESEGARAN_STATUS_USULAN,
  weatherFetchedMaxMs: 2 * 60 * 60 * 1000,
  overlayRefreshMaxMs: 45 * 60 * 1000,
  dibiFetchedMaxMs: 4 * 24 * 60 * 60 * 1000,
};

export function ambangKesegaran(
  override?: Partial<KesegaranAmbang>,
): KesegaranAmbang & { status: typeof KESEGARAN_STATUS_USULAN } {
  return {
    ...KESEGARAN_USULAN_DATA,
    ...override,
    status: KESEGARAN_STATUS_USULAN,
  };
}

export type AlasanKesegaran = {
  basi: boolean;
  alasan: string[];
};

function parsed(iso: string | null): number | null {
  if (!iso) return null;
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : null;
}

/** Cuaca basi bila expires_at sudah lewat atau fetched_at lebih dari ambang. */
export function weatherForecastBasi(
  row: { expiresAt: string | null; fetchedAt: string | null },
  nowMs: number,
  ambang: KesegaranAmbang = KESEGARAN_USULAN_DATA,
): AlasanKesegaran {
  const alasan: string[] = [];
  const expires = parsed(row.expiresAt);
  const fetched = parsed(row.fetchedAt);
  if (expires == null || fetched == null) alasan.push("stempel-tidak-ada");
  if (expires != null && nowMs > expires) alasan.push("expires-at-lewat");
  if (fetched != null && nowMs - fetched > ambang.weatherFetchedMaxMs) {
    alasan.push("fetched-at-lewat-ambang");
  }
  return { basi: alasan.length > 0, alasan };
}

export type OverlayLapisanSampel = { key: string; ok: boolean };

/**
 * Ledger overlay basi bila refresh terakhir melewati ambang,
 * atau ada lapisan yang tidak ok (termasuk bila HTTP masih 200).
 */
export function overlayLedgerBasi(
  sample: {
    refreshedAt: string | null;
    httpStatus: number | null;
    layers: OverlayLapisanSampel[];
  },
  nowMs: number,
  ambang: KesegaranAmbang = KESEGARAN_USULAN_DATA,
): AlasanKesegaran {
  const alasan: string[] = [];
  const refreshed = parsed(sample.refreshedAt);
  if (refreshed == null) alasan.push("stempel-tidak-ada");
  else if (nowMs - refreshed > ambang.overlayRefreshMaxMs) alasan.push("refresh-lewat-ambang");
  const gagal = sample.layers.filter((layer) => !layer.ok);
  if (gagal.length > 0) {
    alasan.push("lapisan-tidak-ok");
    if (sample.httpStatus != null && sample.httpStatus >= 200 && sample.httpStatus < 300) {
      alasan.push("http-200-lapisan-gagal");
    }
  }
  return { basi: alasan.length > 0, alasan };
}

/** Fixture DIBI basi bila fetched_at lebih dari ambang. */
export function dibiFixtureBasi(
  fetchedAt: string | null,
  nowMs: number,
  ambang: KesegaranAmbang = KESEGARAN_USULAN_DATA,
): AlasanKesegaran {
  const fetched = parsed(fetchedAt);
  if (fetched == null) return { basi: true, alasan: ["stempel-tidak-ada"] };
  if (nowMs - fetched > ambang.dibiFetchedMaxMs) {
    return { basi: true, alasan: ["fetched-at-lewat-ambang"] };
  }
  return { basi: false, alasan: [] };
}

/**
 * Bacaan baris net._http_response: hanya status_code dan timed_out.
 * Jangan memasukkan header, isi body, atau antrean yang memuat Authorization.
 */
export function bacaanHttpCron(input: {
  statusCode: number | null;
  timedOut: boolean;
}): { gagal: boolean; alasan: string[] } {
  const alasan: string[] = [];
  if (input.timedOut) alasan.push("timeout");
  if (input.statusCode == null) alasan.push("status-kosong");
  else if (input.statusCode < 200 || input.statusCode >= 300) alasan.push("bukan-2xx");
  return { gagal: alasan.length > 0, alasan };
}

/** Bacaan cron.job_run_details.status. Bukan sambungan ke basis hidup. */
export function bacaanJobRun(input: { status: string | null }): { gagal: boolean } {
  return { gagal: input.status !== "succeeded" };
}
