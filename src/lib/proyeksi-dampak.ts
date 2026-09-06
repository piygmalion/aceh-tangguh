export type DampakCard = {
  id: string;
  date: string;
  kabupaten: string;
  kecamatan: string;
  penyebab: string;
  kronologi: string;
  rr: number;
  rs: number;
  rb: number;
  jiwaTerdampak: number;
  kkTerdampak: number;
  pengungsi: number;
};

export type ProyeksiRange = {
  min: number;
  median: number;
  p75: number;
  max: number;
};

export type MagnitudeBand = "lt5" | "5to6" | "gte6";

export type ScalePeer = {
  id: string;
  value: number;
  band: MagnitudeBand;
  kabupaten: string;
  date: string;
  jiwaTerdampak: number;
  rumah: number;
};

export type CorridorGroup = {
  label: string;
  n: number;
  jiwaMedian: number;
  rumahMedian: number;
};

export type ReplayCard = {
  id: string;
  date: string;
  kabupaten: string;
  jiwaTerdampak: number;
  rr: number;
  rs: number;
  rb: number;
  magnitude: number | null;
  waterCm: number | null;
  corridor: string | null;
};

export type ProyeksiDampak = {
  grain: "kabupaten" | "provinsi" | "none";
  n: number;
  scenario: "ringan" | "khas" | "parah";
  housing: ProyeksiRange | null;
  jiwa: ProyeksiRange | null;
  kk: ProyeksiRange | null;
  pengungsi: ProyeksiRange | null;
  scale: ScalePeer[];
  corridors: CorridorGroup[];
  replay: {
    last: ReplayCard | null;
    worst: ReplayCard | null;
  };
};

function cardText(card: DampakCard): string {
  return `${card.penyebab} ${card.kronologi}`;
}

export function parseMagnitude(text: string | null | undefined): number | null {
  if (!text) return null;
  const patterns = [
    /\bM\s*([0-9]+(?:[.,][0-9]+)?)/i,
    /\bmagnitudo\s*[:=]?\s*([0-9]+(?:[.,][0-9]+)?)/i,
    /\b([0-9]+(?:[.,][0-9]+)?)\s*(?:sr|mw)\b/i,
  ];
  for (const re of patterns) {
    const match = text.match(re);
    if (!match) continue;
    const value = Number(match[1].replace(",", "."));
    if (Number.isFinite(value) && value >= 1 && value <= 10) return value;
  }
  return null;
}

export function parseWaterCm(text: string | null | undefined): number | null {
  if (!text) return null;
  const range = text.match(/(\d+)\s*[-–]\s*(\d+)\s*cm/i);
  if (range) return Math.max(Number(range[1]), Number(range[2]));
  const single = text.match(/(\d+)\s*cm/i);
  if (!single) return null;
  const value = Number(single[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parseSungaiLabel(text: string | null | undefined): string | null {
  if (!text) return null;
  const named = text.match(
    /\b[Ss]ungai\s+([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,3})/
  );
  if (named) {
    const rest = named[1].trim();
    if (rest && !/^(di|dan|yang|pada|dengan|ke|dari)$/i.test(rest)) {
      const pretty = rest
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
      return `Sungai ${pretty}`;
    }
  }
  if (/luapan\s+sungai/i.test(text)) return "luapan sungai";
  return null;
}

export function magnitudeBand(value: number): MagnitudeBand {
  if (value < 5) return "lt5";
  if (value < 6) return "5to6";
  return "gte6";
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function rangeOf(values: number[]): ProyeksiRange | null {
  const positive = values.filter((value) => value > 0);
  if (positive.length === 0) return null;
  return {
    min: Math.min(...positive),
    median: median(positive),
    p75: quantile(positive, 0.75),
    max: Math.max(...positive),
  };
}

function hasPeople(card: DampakCard): boolean {
  return card.jiwaTerdampak + card.kkTerdampak + card.pengungsi > 0;
}

function hasHousing(card: DampakCard): boolean {
  return card.rr + card.rs + card.rb > 0;
}

function hasImpact(card: DampakCard): boolean {
  return hasPeople(card) || hasHousing(card);
}

function rumahTotal(card: DampakCard): number {
  return card.rr + card.rs + card.rb;
}

function isoFromDate(value: string): number {
  const match = value.match(/(\d{4}-\d{2}-\d{2})/);
  if (match) return Date.parse(match[1]);
  return 0;
}

function toReplay(card: DampakCard): ReplayCard {
  const text = cardText(card);
  return {
    id: card.id,
    date: card.date,
    kabupaten: card.kabupaten,
    jiwaTerdampak: card.jiwaTerdampak,
    rr: card.rr,
    rs: card.rs,
    rb: card.rb,
    magnitude: parseMagnitude(text),
    waterCm: parseWaterCm(text),
    corridor: parseSungaiLabel(text) ?? (card.kecamatan || null),
  };
}

function scenarioFromKelas(kelas: string | null | undefined): ProyeksiDampak["scenario"] {
  const u = (kelas ?? "").trim().toUpperCase();
  if (u === "TINGGI") return "parah";
  if (u === "RENDAH") return "ringan";
  return "khas";
}

function corridorGroups(cards: DampakCard[]): CorridorGroup[] {
  const map = new Map<string, DampakCard[]>();
  for (const row of cards) {
    const kec = row.kecamatan.trim();
    const label =
      parseSungaiLabel(cardText(row)) ??
      (kec && kec !== "-" ? kec : "");
    if (!label) continue;
    const cur = map.get(label) ?? [];
    cur.push(row);
    map.set(label, cur);
  }
  return Array.from(map.entries())
    .map(([label, rows]) => ({
      label,
      n: rows.length,
      jiwaMedian: median(rows.map((row) => row.jiwaTerdampak)),
      rumahMedian: median(rows.map((row) => rumahTotal(row))),
    }))
    .sort((a, b) => b.n - a.n || b.jiwaMedian - a.jiwaMedian)
    .slice(0, 4);
}

export function buildProyeksiDampak(input: {
  local: DampakCard[];
  provincial: DampakCard[];
  ancaman: string;
  irbiKelas?: string | null;
}): ProyeksiDampak {
  const localImpact = input.local.filter(hasImpact);
  const provincialImpact = input.provincial.filter(hasImpact);
  const grainSource =
    localImpact.length > 0 ? localImpact : provincialImpact;
  const grain: ProyeksiDampak["grain"] =
    localImpact.length > 0
      ? "kabupaten"
      : provincialImpact.length > 0
        ? "provinsi"
        : "none";

  const scale = [...input.local, ...input.provincial].reduce<ScalePeer[]>(
    (acc, row) => {
      const value = parseMagnitude(cardText(row));
      if (value == null) return acc;
      if (acc.some((peer) => peer.id === row.id)) return acc;
      acc.push({
        id: row.id,
        value,
        band: magnitudeBand(value),
        kabupaten: row.kabupaten,
        date: row.date,
        jiwaTerdampak: row.jiwaTerdampak,
        rumah: rumahTotal(row),
      });
      return acc;
    },
    []
  ).sort((a, b) => b.value - a.value);

  const last = [...grainSource].sort((a, b) => isoFromDate(b.date) - isoFromDate(a.date))[0];
  const worst = [...grainSource].sort((a, b) => {
    const jiwa = b.jiwaTerdampak - a.jiwaTerdampak;
    if (jiwa !== 0) return jiwa;
    return rumahTotal(b) - rumahTotal(a);
  })[0];

  return {
    grain,
    n: grainSource.length,
    scenario: scenarioFromKelas(input.irbiKelas),
    housing: rangeOf(grainSource.map((row) => rumahTotal(row))),
    jiwa: rangeOf(grainSource.map((row) => row.jiwaTerdampak)),
    kk: rangeOf(grainSource.map((row) => row.kkTerdampak)),
    pengungsi: rangeOf(grainSource.map((row) => row.pengungsi)),
    scale,
    corridors:
      input.ancaman === "banjir" || input.ancaman === "banjir_bandang"
        ? corridorGroups(grain === "kabupaten" ? input.local : grainSource)
        : [],
    replay: {
      last: last ? toReplay(last) : null,
      worst: worst ? toReplay(worst) : null,
    },
  };
}
