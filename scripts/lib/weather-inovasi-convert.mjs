/** Keep in sync with src/lib/weather-inovasi/convert.ts */

export function kelvinToC(kelvin) {
  if (!Number.isFinite(kelvin)) return null;
  return Math.round((kelvin - 273.15) * 10) / 10;
}

export function metersToMm(meters) {
  if (!Number.isFinite(meters)) return null;
  return Math.round(meters * 1000 * 10) / 10;
}

export function msToKmh(metersPerSecond) {
  if (!Number.isFinite(metersPerSecond)) return null;
  return Math.round(metersPerSecond * 3.6 * 10) / 10;
}

export function humidityFromTandTd(tempC, dewC) {
  if (tempC == null || dewC == null) return null;
  if (!Number.isFinite(tempC) || !Number.isFinite(dewC)) return null;
  const vapor = (t) => 6.112 * Math.exp((17.67 * t) / (t + 243.5));
  const rh = (100 * vapor(dewC)) / vapor(tempC);
  if (!Number.isFinite(rh)) return null;
  return Math.min(100, Math.max(0, Math.round(rh * 10) / 10));
}
