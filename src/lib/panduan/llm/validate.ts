const ALLOWED_ALWAYS = new Set(["112"]);

const SENTENCE_COUNTER_DIGITS = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);

const OPERATIONAL_CONTEXT =
  /korban|jiwa|meninggal|tewas|luka|pengungsi|siaga|darurat|\bsk\b|kepgub|evakuasi|casualty|fatalit|injur|decree|alert|evacuat/i;

const WORD_COUNTER =
  "satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|one|two|three|four|five|six|seven|eight|nine|ten";

const WORD_OPERATIONAL = new RegExp(
  `\\b(?:${WORD_COUNTER})\\s+(?:korban|jiwa|meninggal|tewas|luka|pengungsi|siaga|darurat|sk|evakuasi|casualt(?:y|ies)|fatalit\\w*|injur\\w*|decree|alert|evacuat\\w*)\\b|\\b(?:korban|jiwa|meninggal|tewas|casualt(?:y|ies)|fatalit\\w*|injur\\w*)\\s+(?:${WORD_COUNTER})\\b`,
  "i"
);

export function extractOperationalNumbers(text: string): string[] {
  return Array.from(text.matchAll(/\b\d+(?:[.,]\d+)?\b/g), (match) => match[0]);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function numberHasOperationalContext(body: string, n: string): boolean {
  const re = new RegExp(`(?:\\S+\\s+){0,3}\\b${escapeRegExp(n)}\\b(?:\\s+\\S+){0,3}`, "gi");
  for (const match of Array.from(body.matchAll(re))) {
    if (OPERATIONAL_CONTEXT.test(match[0])) return true;
  }
  return false;
}

export function stripInternalSourceIds(body: string, chunks: { sourceId: string }[]): string {
  let next = body;
  const ids = [...chunks.map((chunk) => chunk.sourceId), "sourceId"].filter(Boolean);
  for (const id of ids) {
    const safe = escapeRegExp(id);
    next = next.replace(new RegExp(`\\[${safe}\\]`, "gi"), "");
    next = next.replace(new RegExp(`\\b${safe}\\b`, "gi"), "");
  }
  return next.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
}

export function validateGroundedBody(
  body: string,
  chunks: { text: string }[],
  _query?: string
): boolean {
  const trimmed = body.trim();
  if (trimmed.length < 12) return false;
  if (/tidak (tahu|yakin)|i (don't|do not) know/i.test(trimmed) && trimmed.length < 80) {
    return false;
  }

  if (WORD_OPERATIONAL.test(trimmed)) return false;

  const corpus = chunks.map((chunk) => chunk.text).join(" ");
  const allowed = new Set(extractOperationalNumbers(corpus));
  ALLOWED_ALWAYS.forEach((extra) => {
    allowed.add(extra);
  });

  for (const n of extractOperationalNumbers(trimmed)) {
    if (ALLOWED_ALWAYS.has(n)) continue;
    if (allowed.has(n)) continue;
    if (SENTENCE_COUNTER_DIGITS.has(n) && !numberHasOperationalContext(trimmed, n)) continue;
    return false;
  }
  return true;
}
