import type { GuideContext, GuideLocale } from "./types";

function t(locale: GuideLocale, id: string, en: string): string {
  return locale === "en" ? en : id;
}

export function briefingLead(locale: GuideLocale): string {
  return t(
    locale,
    "Ringkasan umpan peringatan di situs ini — bukan saluran darurat. Untuk darurat hubungi 112 atau Pusdalops.",
    "This is a summary of site warning feeds — not an emergency channel. In an emergency call 112 or Pusdalops."
  );
}

function delayedNote(locale: GuideLocale, label: string): string {
  return t(
    locale,
    `Data ${label} sedang tertunda. Buka halaman terkait — angka tidak saya isi sendiri.`,
    `${label} data is delayed. Open the related page — I will not invent figures.`
  );
}

/** Deterministic four-clause briefing. No LLM. No invented casualties or alert levels. */
export function compileAlertBrief(ctx: GuideContext, locale: GuideLocale): {
  lead: string;
  clauses: string[];
  body: string;
} {
  if (ctx.failed.includes("peringatan") || !ctx.peringatan) {
    return {
      lead: "",
      clauses: [delayedNote(locale, t(locale, "peringatan dini", "early warning"))],
      body: delayedNote(locale, t(locale, "peringatan dini", "early warning")),
    };
  }

  const p = ctx.peringatan;
  const cuaca = p.cuacaUnmatched
    ? t(
        locale,
        `Cuaca: tidak ada baris yang cocok untuk ${p.cuacaUnmatched}.`,
        `Weather: no row matched ${p.cuacaUnmatched}.`
      )
    : p.cuacaEmpty
      ? t(locale, "Cuaca: tidak ada peringatan ekstrem.", "Weather: no extreme warning.")
      : t(locale, `Cuaca: ${p.cuacaHighlight}.`, `Weather: ${p.cuacaHighlight}.`);

  const magma =
    p.magmaSource === "unavailable"
      ? t(
          locale,
          "Gempa MAGMA: umpan tertunda. Saya tidak mengulang gempa lama.",
          "MAGMA quake: feed delayed. I will not repeat a previous event."
        )
      : p.magmaEmpty
        ? t(
            locale,
            "Gempa MAGMA: tidak ada kejadian Aceh pada feed terkini.",
            "MAGMA quake: no Aceh event on the current feed."
          )
        : t(locale, `Gempa MAGMA: ${p.magmaSummary}.`, `MAGMA quake: ${p.magmaSummary}.`);

  const sipongi = p.sipongiUnmatched
    ? t(
        locale,
        `Sipongi: tidak ada baris yang cocok untuk ${p.sipongiUnmatched}.`,
        `Sipongi: no row matched ${p.sipongiUnmatched}.`
      )
    : p.sipongiEmpty
      ? t(locale, "Sipongi: tidak ada hotspot Aceh (medium/tinggi).", "Sipongi: no Aceh hotspots (medium/high).")
      : t(
          locale,
          `Sipongi: ${p.sipongiCount} hotspot, antara lain ${p.sipongiPlace ?? "Aceh"}.`,
          `Sipongi: ${p.sipongiCount} hotspot(s), including ${p.sipongiPlace ?? "Aceh"}.`
        );

  const tatonas = p.tatonasEmpty
    ? t(
        locale,
        "Tatonas: tidak ada pos hidrologi di atas ambang, atau umpan tertunda.",
        "Tatonas: no hydrology post above threshold, or the feed is delayed."
      )
    : t(
        locale,
        `Tatonas: ${p.tatonasHighlight ?? "pos hidrologi tercatat"}.`,
        `Tatonas: ${p.tatonasHighlight ?? "a hydrology post is recorded"}.`
      );

  const stale = p.stale
    ? t(locale, " Sebagian umpan berlabel data tertunda.", " Some feeds are marked as delayed.")
    : "";

  const clauses = [cuaca, magma, sipongi, tatonas];
  const lead = briefingLead(locale);
  return { lead, clauses, body: [lead, ...clauses].join(" ") + stale };
}
