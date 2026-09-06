/**
 * Conflict-safe merge of SIK kejadian rows into Aceh Tangguh kejadian.
 * Enrichment only: fill-null, GPS upgrade, new SIK- ids. Never rewrite jenis.
 */

import {
  foldText,
  normalizeKabupaten,
  normalizeTanggalKey,
} from "./sik-schema.mjs";

export const TEN_DIGIT_KODE = /^\d{10}$/;
export const ACEH_LAT = { min: 2.0, max: 6.5 };
export const ACEH_LNG = { min: 94.5, max: 99.5 };
export const GPS_CONFLICT_METERS = 100;
export const SIK_SOURCE = "sik_aceh.db";

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function tenDigitKode(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return TEN_DIGIT_KODE.test(s) ? s : null;
}

/**
 * @param {unknown} jenis
 */
export function isRekapitulasiTahunan(jenis) {
  if (jenis == null) return false;
  return String(jenis).toLowerCase().includes("rekapitulasi tahunan");
}

/**
 * @param {unknown} value
 */
export function toFiniteNumber(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const s = String(value).trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} value
 */
export function isIntegerCoord(value) {
  const n = toFiniteNumber(value);
  return n != null && Number.isInteger(n);
}

/**
 * @param {number} lat
 * @param {number} lng
 */
export function inAcehBbox(lat, lng) {
  return (
    lat >= ACEH_LAT.min &&
    lat <= ACEH_LAT.max &&
    lng >= ACEH_LNG.min &&
    lng <= ACEH_LNG.max
  );
}

/**
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 */
export function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * @param {unknown} value
 */
export function round4(value) {
  const n = toFiniteNumber(value);
  if (n == null) return "";
  return n.toFixed(4);
}

/**
 * @param {unknown} value
 */
export function emptyish(value) {
  if (value == null) return true;
  if (typeof value === "string") {
    const s = value.trim();
    return s === "" || s === "-";
  }
  return false;
}

/**
 * @param {Record<string, unknown>} sik
 */
export function readSikCoords(sik) {
  const lat = toFiniteNumber(sik.latitude ?? sik.lat);
  const lng = toFiniteNumber(sik.longitude ?? sik.lng ?? sik.lon);
  if (lat == null || lng == null) return { lat: null, lng: null };
  return { lat, lng };
}

/**
 * @param {Record<string, unknown>} existing
 */
export function readExistingCoords(existing) {
  const arah =
    existing.arah_di_peta && typeof existing.arah_di_peta === "object"
      ? existing.arah_di_peta
      : {};
  const lat = toFiniteNumber(arah.latitude ?? existing.latitude);
  const lng = toFiniteNumber(arah.longitude ?? existing.longitude);
  if (lat == null || lng == null) return { lat: null, lng: null };
  return { lat, lng };
}

/**
 * @param {Record<string, unknown>} row
 */
export function naturalKey(row) {
  const jenis = foldText(row.jenis_bencana);
  const tanggal = normalizeTanggalKey(row.hari_tanggal);
  const kode = tenDigitKode(
    row.kode_desa_kelurahan ??
      (row.lokasi && typeof row.lokasi === "object"
        ? row.lokasi.kode_desa_kelurahan
        : null)
  );
  const lokasi = row.lokasi && typeof row.lokasi === "object" ? row.lokasi : {};
  const kab = foldText(
    normalizeKabupaten(row.kabupaten ?? lokasi.kabupaten ?? lokasi.kabupaten_kota)
  );
  const kec = foldText(row.kecamatan ?? lokasi.kecamatan);
  const desa = foldText(row.desa ?? lokasi.desa);
  const place = kode || [kab, kec, desa].filter(Boolean).join("|");
  const { lat, lng } = row.latitude != null || row.longitude != null
    ? readSikCoords(row)
    : readExistingCoords(row);
  const coord = lat != null && lng != null ? `${round4(lat)},${round4(lng)}` : "nocord";
  return `${jenis}::${tanggal}::${place}::${coord}`;
}

/**
 * @param {unknown} sikId
 */
export function newSikEventId(sikId) {
  const raw = String(sikId ?? "")
    .trim()
    .replace(/\s+/g, "-");
  if (!raw) return null;
  if (raw.startsWith("SIK-")) return raw;
  return `SIK-${raw}`;
}

/**
 * @param {{ lat: number | null, lng: number | null }} existing
 * @param {{ lat: number | null, lng: number | null }} incoming
 */
export function classifyGps(existing, incoming) {
  if (incoming.lat == null || incoming.lng == null) {
    return { action: "keep", reason: "sik_missing_gps" };
  }
  if (existing.lat == null || existing.lng == null) {
    return { action: "use_incoming", reason: "existing_missing_gps" };
  }
  const existingTruncated =
    isIntegerCoord(existing.lat) || isIntegerCoord(existing.lng);
  const incomingTruncated =
    isIntegerCoord(incoming.lat) || isIntegerCoord(incoming.lng);
  const incomingInBox = inAcehBbox(incoming.lat, incoming.lng);

  if (!existingTruncated && incomingTruncated) {
    return { action: "keep", reason: "existing_better_than_integer_sik" };
  }
  if (existingTruncated && !incomingTruncated && incomingInBox) {
    return { action: "upgrade", reason: "sik_decimal_replaces_truncated" };
  }
  const bothDecimal = !existingTruncated && !incomingTruncated;
  if (bothDecimal) {
    const meters = haversineMeters(
      existing.lat,
      existing.lng,
      incoming.lat,
      incoming.lng
    );
    if (meters > GPS_CONFLICT_METERS) {
      return { action: "quarantine", reason: "decimal_gps_gt_100m", meters };
    }
  }
  return { action: "keep", reason: "existing_gps_ok" };
}

/**
 * @param {unknown} current
 * @param {unknown} incoming
 */
export function valuesConflict(current, incoming) {
  if (emptyish(current) || emptyish(incoming)) return false;
  if (typeof current === "number" || typeof incoming === "number") {
    const a = toFiniteNumber(current);
    const b = toFiniteNumber(incoming);
    if (a == null || b == null) return String(current) !== String(incoming);
    return a !== b;
  }
  return foldText(current) !== foldText(incoming);
}

/**
 * @param {Record<string, unknown>} existing
 * @param {Record<string, unknown>} sik
 */
export function applyFillNull(existing, sik) {
  /** @type {string[]} */
  const filled = [];
  /** @type {{ field: string, existing: unknown, sik: unknown }[]} */
  const conflicts = [];
  const next = structuredClone(existing);

  const scalarFields = [
    "hari_tanggal",
    "jam",
    "penyebab",
    "kronologi",
    "kendala_kebutuhan_mendesak",
    "jiwa_terdampak",
    "kk_terdampak",
    "pengungsi",
    "estimasi_kerugian_rp",
  ];

  for (const field of scalarFields) {
    if (sik[field] == null || sik[field] === "") continue;
    if (emptyish(next[field])) {
      next[field] = sik[field];
      filled.push(field);
    } else if (valuesConflict(next[field], sik[field])) {
      conflicts.push({ field, existing: next[field], sik: sik[field] });
    }
  }

  if (!next.lokasi || typeof next.lokasi !== "object") next.lokasi = {};
  const lokasi = /** @type {Record<string, unknown>} */ (next.lokasi);
  const lokasiFields = [
    ["kabupaten", sik.kabupaten],
    ["kabupaten_kota", sik.kabupaten],
    ["kecamatan", sik.kecamatan],
    ["desa", sik.desa],
    ["kode_desa_kelurahan", tenDigitKode(sik.kode_desa_kelurahan)],
  ];
  for (const [field, value] of lokasiFields) {
    if (value == null || value === "") continue;
    if (emptyish(lokasi[field])) {
      lokasi[field] = value;
      filled.push(`lokasi.${field}`);
    }
  }

  if (!next.jumlah_korban || typeof next.jumlah_korban !== "object") {
    next.jumlah_korban = {};
  }
  const korban = /** @type {Record<string, unknown>} */ (next.jumlah_korban);
  for (const field of ["meninggal", "hilang", "luka_berat", "luka_ringan"]) {
    if (sik[field] == null || sik[field] === "") continue;
    if (emptyish(korban[field])) {
      korban[field] = sik[field];
      filled.push(`jumlah_korban.${field}`);
    } else if (valuesConflict(korban[field], sik[field])) {
      conflicts.push({
        field: `jumlah_korban.${field}`,
        existing: korban[field],
        sik: sik[field],
      });
    }
  }

  if (!next.penanganan || typeof next.penanganan !== "object") {
    next.penanganan = {};
  }
  const pen = /** @type {Record<string, unknown>} */ (next.penanganan);
  if (!emptyish(sik.status_proses) && emptyish(pen.status_proses)) {
    pen.status_proses = sik.status_proses;
    filled.push("penanganan.status_proses");
  } else if (
    !emptyish(sik.status_proses) &&
    valuesConflict(pen.status_proses, sik.status_proses)
  ) {
    conflicts.push({
      field: "penanganan.status_proses",
      existing: pen.status_proses,
      sik: sik.status_proses,
    });
  }

  return { next, filled, conflicts };
}

/**
 * @param {Record<string, unknown>} row
 * @param {Record<string, unknown>} sik
 * @param {Record<string, unknown>} extra
 */
export function attachSikProvenance(row, sik, extra = {}) {
  const next = structuredClone(row);
  const payload =
    next.payload && typeof next.payload === "object" ? { ...next.payload } : {};
  payload.sik_id = sik.sik_id ?? payload.sik_id;
  payload.sik = {
    ...((payload.sik && typeof payload.sik === "object" && payload.sik) || {}),
    ...extra,
  };
  next.payload = payload;

  const sources = Array.isArray(next.sumber_data)
    ? [...next.sumber_data]
    : next.sumber_data
      ? [next.sumber_data]
      : [];
  if (!sources.includes(SIK_SOURCE)) sources.push(SIK_SOURCE);
  next.sumber_data = sources;
  return next;
}

/**
 * @param {Record<string, unknown>} sik
 */
export function sikRowToKejadian(sik) {
  const id = newSikEventId(sik.sik_id);
  const kab = normalizeKabupaten(sik.kabupaten);
  const { lat, lng } = readSikCoords(sik);
  const kode = tenDigitKode(sik.kode_desa_kelurahan);
  /** @type {Record<string, unknown>} */
  const row = {
    id,
    jenis_bencana: sik.jenis_bencana,
    hari_tanggal: sik.hari_tanggal ?? "",
    jam: sik.jam ?? undefined,
    penyebab: sik.penyebab ?? undefined,
    kronologi: sik.kronologi ?? undefined,
    jiwa_terdampak: sik.jiwa_terdampak ?? null,
    kk_terdampak: sik.kk_terdampak ?? null,
    pengungsi: sik.pengungsi ?? null,
    lokasi: {
      desa: sik.desa ?? "-",
      kecamatan: sik.kecamatan ?? undefined,
      kabupaten: kab ?? undefined,
      kabupaten_kota: kab ?? undefined,
      provinsi: "Aceh",
      kode_desa_kelurahan: kode,
    },
    jumlah_korban: {
      meninggal: sik.meninggal ?? undefined,
      hilang: sik.hilang ?? undefined,
      luka_berat: sik.luka_berat ?? undefined,
      luka_ringan: sik.luka_ringan ?? undefined,
    },
    penanganan: {
      status_proses: sik.status_proses ?? undefined,
    },
    sumber_data: [SIK_SOURCE],
    payload: { sik_id: sik.sik_id, sik: { imported: true } },
  };
  if (lat != null && lng != null) {
    row.arah_di_peta = {
      latitude: lat,
      longitude: lng,
      sumber_koordinat: "sik_aceh",
      kabupaten_referensi: kab,
    };
  }
  return row;
}

/**
 * @param {Record<string, unknown>[]} existingRows
 * @param {Record<string, unknown>[]} sikRows
 */
export function mergeSikIntoKejadian(existingRows, sikRows) {
  const kejadian = existingRows.map((row) => structuredClone(row));
  const byId = new Map(kejadian.map((row, i) => [String(row.id), i]));
  const bySikId = new Map();
  const byNatural = new Map();

  for (let i = 0; i < kejadian.length; i += 1) {
    const row = kejadian[i];
    const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
    if (payload.sik_id != null) bySikId.set(String(payload.sik_id), i);
    byNatural.set(naturalKey(row), i);
  }

  /** @type {any} */
  const report = {
    matched: 0,
    new: 0,
    fillNull: 0,
    gpsUpgrades: 0,
    skipped: [],
    gpsConflicts: [],
    attributeConflicts: [],
  };

  for (const sik of sikRows) {
    if (isRekapitulasiTahunan(sik.jenis_bencana)) {
      report.skipped.push({ sik_id: sik.sik_id, reason: "rekapitulasi_tahunan" });
      continue;
    }
    if (emptyish(sik.jenis_bencana)) {
      report.skipped.push({ sik_id: sik.sik_id, reason: "missing_jenis" });
      continue;
    }

    const kab = normalizeKabupaten(sik.kabupaten);
    const sikNorm = { ...sik, kabupaten: kab };
    const incomingId = sikNorm.sik_id != null ? String(sikNorm.sik_id) : "";

    let index = -1;
    if (incomingId && bySikId.has(incomingId)) {
      index = bySikId.get(incomingId);
    } else if (incomingId && byId.has(incomingId)) {
      index = byId.get(incomingId);
    } else {
      const key = naturalKey({
        ...sikNorm,
        lokasi: {
          kabupaten: kab,
          kecamatan: sikNorm.kecamatan,
          desa: sikNorm.desa,
          kode_desa_kelurahan: sikNorm.kode_desa_kelurahan,
        },
        arah_di_peta: {
          latitude: sikNorm.latitude,
          longitude: sikNorm.longitude,
        },
      });
      if (byNatural.has(key)) index = byNatural.get(key);
    }

    if (index >= 0) {
      const current = kejadian[index];
      if (
        current.jenis_bencana &&
        sikNorm.jenis_bencana &&
        foldText(current.jenis_bencana) !== foldText(sikNorm.jenis_bencana)
      ) {
        report.attributeConflicts.push({
          id: current.id,
          sik_id: sikNorm.sik_id,
          field: "jenis_bencana",
          existing: current.jenis_bencana,
          sik: sikNorm.jenis_bencana,
          note: "jenis_bencana not rewritten",
        });
      }

      const gps = classifyGps(readExistingCoords(current), readSikCoords(sikNorm));
      let next = current;
      if (gps.action === "quarantine") {
        report.gpsConflicts.push({
          id: current.id,
          sik_id: sikNorm.sik_id,
          reason: gps.reason,
          meters: gps.meters,
          existing: readExistingCoords(current),
          sik: readSikCoords(sikNorm),
        });
      } else if (gps.action === "upgrade" || gps.action === "use_incoming") {
        const { lat, lng } = readSikCoords(sikNorm);
        const arah =
          next.arah_di_peta && typeof next.arah_di_peta === "object"
            ? { ...next.arah_di_peta }
            : {};
        arah.latitude = lat;
        arah.longitude = lng;
        arah.sumber_koordinat = "sik_aceh";
        next = { ...next, arah_di_peta: arah };
        if (gps.action === "upgrade") report.gpsUpgrades += 1;
      }

      const filled = applyFillNull(next, sikNorm);
      next = filled.next;
      report.fillNull += filled.filled.length;
      for (const conflict of filled.conflicts) {
        report.attributeConflicts.push({
          id: current.id,
          sik_id: sikNorm.sik_id,
          ...conflict,
        });
      }
      next = attachSikProvenance(next, sikNorm, {
        matched: true,
        gps: gps.action,
        attribute_conflicts: filled.conflicts,
      });
      kejadian[index] = next;
      report.matched += 1;
      continue;
    }

    const created = sikRowToKejadian(sikNorm);
    if (!created.id) {
      report.skipped.push({ sik_id: sikNorm.sik_id, reason: "missing_sik_id" });
      continue;
    }
    if (byId.has(String(created.id))) {
      created.id = `${created.id}-dup`;
    }
    kejadian.push(created);
    byId.set(String(created.id), kejadian.length - 1);
    if (incomingId) bySikId.set(incomingId, kejadian.length - 1);
    byNatural.set(naturalKey(created), kejadian.length - 1);
    report.new += 1;
  }

  return { kejadian, report };
}

/**
 * 10-digit kode ∩ coded profil rows; fill-null only. Never invent kodes.
 * @param {Record<string, unknown>[]} profilRows
 * @param {Record<string, unknown>[]} sikDesaRows
 * @param {string[]} fields
 */
export function fillNullProfilByKode(profilRows, sikDesaRows, fields) {
  const byKode = new Map();
  for (const row of sikDesaRows) {
    const kode = tenDigitKode(row.kode_desa_kelurahan ?? row.kode_desa);
    if (kode) byKode.set(kode, row);
  }

  /** @type {any} */
  const report = { updated: 0, skipped_no_kode: 0, skipped_unknown_kode: 0, conflicts: [] };
  const next = profilRows.map((row) => {
    const kode = tenDigitKode(row.kode_desa_kelurahan);
    if (!kode) {
      report.skipped_no_kode += 1;
      return row;
    }
    const sik = byKode.get(kode);
    if (!sik) {
      report.skipped_unknown_kode += 1;
      return row;
    }
    const copy = { ...row };
    let changed = false;
    for (const field of fields) {
      if (sik[field] == null || sik[field] === "") continue;
      if (emptyish(copy[field])) {
        copy[field] = sik[field];
        changed = true;
      } else if (valuesConflict(copy[field], sik[field])) {
        report.conflicts.push({
          kode,
          field,
          existing: copy[field],
          sik: sik[field],
        });
      }
    }
    if (changed) report.updated += 1;
    return copy;
  });
  return { rows: next, report };
}
