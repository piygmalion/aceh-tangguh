/** Unit conversion for WeatherNext 3 raw fields. Official BMKG path must not import this. */

export function kelvinToC(kelvin: number): number | null {
  if (!Number.isFinite(kelvin)) return null;
  return Math.round((kelvin - 273.15) * 10) / 10;
}

export function metersToMm(meters: number): number | null {
  if (!Number.isFinite(meters)) return null;
  return Math.round(meters * 1000 * 10) / 10;
}

export function msToKmh(metersPerSecond: number): number | null {
  if (!Number.isFinite(metersPerSecond)) return null;
  return Math.round(metersPerSecond * 3.6 * 10) / 10;
}

/** Magnus (Alduchov–Eskridge). Null if either input is missing. */
export function humidityFromTandTd(
  tempC: number | null,
  dewC: number | null,
): number | null {
  if (tempC == null || dewC == null) return null;
  if (!Number.isFinite(tempC) || !Number.isFinite(dewC)) return null;
  const vapor = (t: number) => 6.112 * Math.exp((17.67 * t) / (t + 243.5));
  const rh = (100 * vapor(dewC)) / vapor(tempC);
  if (!Number.isFinite(rh)) return null;
  return Math.min(100, Math.max(0, Math.round(rh * 10) / 10));
}

export function windDirectionFromUv(
  uMs: number,
  vMs: number,
): number | null {
  if (!Number.isFinite(uMs) || !Number.isFinite(vMs)) return null;
  const deg = (Math.atan2(-uMs, -vMs) * 180) / Math.PI;
  return (deg + 360) % 360;
}
