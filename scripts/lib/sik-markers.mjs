/**
 * Rebuild disasterEvents points from operational kejadian-bencana.json.
 * Does not read Drive. Other marker layers are preserved as-is.
 */

import {
  inAcehBbox,
  isIntegerCoord,
  isRekapitulasiTahunan,
  toFiniteNumber,
} from "./sik-merge.mjs";

const SIK_SOURCE = "sik_aceh.db";

/**
 * @param {Record<string, unknown>} ev
 */
export function kejadianToDisasterFeature(ev) {
  const jenisRaw = ev.jenis_bencana ? String(ev.jenis_bencana) : "";
  if (isRekapitulasiTahunan(jenisRaw)) return null;
  const arah = ev.arah_di_peta && typeof ev.arah_di_peta === "object" ? ev.arah_di_peta : {};
  const lat = toFiniteNumber(arah.latitude);
  const lng = toFiniteNumber(arah.longitude);
  if (lat == null || lng == null) return { skipped: "no_gps" };
  const lokasi = ev.lokasi && typeof ev.lokasi === "object" ? ev.lokasi : {};
  const kab = lokasi.kabupaten || lokasi.kabupaten_kota || null;
  const pen = ev.penanganan && typeof ev.penanganan === "object" ? ev.penanganan : {};
  const jenis = jenisRaw || "Bencana";
  const title = kab ? `${jenis} — ${kab}` : jenis;
  let kron = ev.kronologi ? String(ev.kronologi) : "";
  if (kron.length > 280) kron = `${kron.slice(0, 277)}...`;
  const korban = ev.jumlah_korban && typeof ev.jumlah_korban === "object" ? ev.jumlah_korban : {};
  const sources = Array.isArray(ev.sumber_data) ? ev.sumber_data : [];
  const fromSik =
    String(ev.id || "").startsWith("SIK-") ||
    sources.includes(SIK_SOURCE) ||
    (ev.payload && typeof ev.payload === "object" && ev.payload.sik_id != null);
  /** @type {Record<string, unknown>} */
  const props = {
    layer: "disasterEvents",
    title,
    status: pen.status_proses || null,
    kabupaten: kab,
    jenis_bencana: jenis,
    hari_tanggal: ev.hari_tanggal ?? null,
    jiwa_terdampak: ev.jiwa_terdampak ?? null,
    kk_terdampak: ev.kk_terdampak ?? null,
    pengungsi: ev.pengungsi ?? null,
    meninggal: korban.meninggal ?? null,
    kronologi: kron || null,
    source: fromSik ? SIK_SOURCE : "kejadian-bencana.json",
  };
  if (lokasi.desa != null) props.desa = lokasi.desa;
  if (lokasi.kode_desa_kelurahan) props.kode_desa_kelurahan = lokasi.kode_desa_kelurahan;
  if (!inAcehBbox(lat, lng)) {
    props.approx = true;
    props.coord_quality = "offshore_or_out_of_bbox";
  } else if (isIntegerCoord(lat) || isIntegerCoord(lng)) {
    props.approx = true;
    props.coord_quality = "truncated_integer";
  }
  return {
    type: "Feature",
    id: ev.id,
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: props,
  };
}

/**
 * @param {object} markers
 * @param {object[]} kejadian
 */
export function rebuildDisasterEventLayer(markers, kejadian) {
  const other = (markers.features || []).filter(
    (f) => f?.properties?.layer !== "disasterEvents"
  );
  let skippedNoGps = 0;
  let skippedRekap = 0;
  const disaster = [];
  for (const ev of kejadian) {
    const feature = kejadianToDisasterFeature(ev);
    if (feature == null) {
      skippedRekap += 1;
      continue;
    }
    if (feature.skipped === "no_gps") {
      skippedNoGps += 1;
      continue;
    }
    disaster.push(feature);
  }
  return {
    collection: {
      type: "FeatureCollection",
      features: [...other, ...disaster],
    },
    counts: {
      disasterEvents: disaster.length,
      preservedOther: other.length,
      skippedNoGps,
      skippedRekap,
    },
  };
}

/**
 * @param {Record<string, unknown>} row
 */
export function kejadianToSupabaseRow(row) {
  const lokasi = row.lokasi && typeof row.lokasi === "object" ? row.lokasi : {};
  const arah = row.arah_di_peta && typeof row.arah_di_peta === "object" ? row.arah_di_peta : {};
  const payload = {
    ...(row.payload && typeof row.payload === "object" ? row.payload : {}),
    lokasi,
    hari_tanggal: row.hari_tanggal,
    jam: row.jam,
    penyebab: row.penyebab,
    jenis_bencana: row.jenis_bencana,
    kerusakan_dan_korban: row.kerusakan_dan_korban,
    jumlah_korban: row.jumlah_korban,
    kronologi: row.kronologi,
    kendala_kebutuhan_mendesak: row.kendala_kebutuhan_mendesak,
    foto: row.foto,
    penanganan: row.penanganan,
    arah_di_peta: arah,
    sumber_data: row.sumber_data,
    estimasi_kerugian_rp: row.estimasi_kerugian_rp,
    jiwa_terdampak: row.jiwa_terdampak,
    kk_terdampak: row.kk_terdampak,
    pengungsi: row.pengungsi,
    lokasi_detail: row.lokasi_detail,
  };
  return {
    id: String(row.id),
    jenis_bencana: String(row.jenis_bencana || "Lainnya"),
    hari_tanggal: row.hari_tanggal ? String(row.hari_tanggal) : null,
    kabupaten: lokasi.kabupaten || lokasi.kabupaten_kota || null,
    kecamatan: lokasi.kecamatan || null,
    desa: lokasi.desa || null,
    longitude: toFiniteNumber(arah.longitude),
    latitude: toFiniteNumber(arah.latitude),
    payload,
  };
}

/**
 * @param {object} feature
 */
export function featureToMarkerRow(feature) {
  const props = feature.properties && typeof feature.properties === "object"
    ? feature.properties
    : {};
  const [lng, lat] = feature.geometry?.coordinates || [];
  return {
    id: String(feature.id),
    layer: String(props.layer || "disasterEvents"),
    title: props.title ?? null,
    status: props.status ?? null,
    kabupaten: props.kabupaten ?? null,
    longitude: Number(lng),
    latitude: Number(lat),
    properties: props,
  };
}
