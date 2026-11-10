/**
 * Pembacaan jadwal yang sudah di-commit dan penggolongan baris log.
 * Tidak memanggil jaringan, tidak menulis produksi, tidak membaca secret.
 */

const CRON_LINE = /^\s*-\s+cron:\s*"([^"]+)"/gm;

export function scheduledCronLines(yaml) {
  if (typeof yaml !== "string") return [];
  return [...yaml.matchAll(CRON_LINE)].map((match) => match[1]);
}

/**
 * Jam dan menit WIB sebagai "HH.mm". Stempel masukan tetap UTC (ISO).
 */
export function formatWibHm(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  if (!hour || !minute) return null;
  return `${hour}.${minute}`;
}

/** Selisih menit dari jadwal UTC ke waktu jalan yang tercatat. Negatif bila lebih awal. */
export function delayMinutes(scheduledUtc, startedUtc) {
  const scheduled = new Date(scheduledUtc).getTime();
  const started = new Date(startedUtc).getTime();
  if (!Number.isFinite(scheduled) || !Number.isFinite(started)) return null;
  return Math.round((started - scheduled) / 60_000);
}

/**
 * Cocok dengan log fungsi `POST /api/cron/overlay-live` saat lapisan Tatonas
 * putus karena AbortSignal. Bukan 404 dan bukan angka pos.
 */
export function isTatonasRefreshTimeout(text) {
  if (typeof text !== "string") return false;
  return (
    text.includes("[overlay-live/refresh]") &&
    text.includes("tatonasStations") &&
    /TimeoutError|aborted due to timeout/.test(text)
  );
}
