import { formatRpCompact } from "@/lib/anggaran-format";
import { DATA_SOURCES } from "@/lib/data-sources";
import { HOME_TOUR_STEPS } from "./tour-steps";
import type {
  GuideAnswer,
  GuideContext,
  GuideHref,
  GuideLink,
  GuideLocale,
  GuideMatch,
} from "./types";

function t(
  locale: GuideLocale,
  id: string,
  en: string
): string {
  return locale === "en" ? en : id;
}

function link(
  href: GuideHref,
  labelKey: string,
  extra?: { hash?: string; accent?: boolean }
): GuideLink {
  return { href, labelKey, ...extra };
}

function staleNote(locale: GuideLocale, stale?: boolean): string {
  if (!stale) return "";
  return t(
    locale,
    " Sebagian umpan berlabel data tertunda.",
    " Some feeds are marked as delayed."
  );
}

function failedNote(locale: GuideLocale, label: string): string {
  return t(
    locale,
    `Data ${label} sedang tertunda. Buka halaman terkait — angka tidak saya isi sendiri.`,
    `${label} data is delayed. Open the related page — I will not invent figures.`
  );
}

function fallbackLinks(locale: GuideLocale): GuideLink[] {
  void locale;
  return [
    link("/nomor-penting", "linkNomor"),
    link("/lapor/kejadian", "linkLapor", { accent: true }),
  ];
}

export function composeGuideAnswer(
  match: GuideMatch,
  ctx: GuideContext,
  locale: GuideLocale
): GuideAnswer {
  if (match.intent === "unknown") {
    return composeUnknown(match, locale);
  }
  if (match.faq) {
    return composeFaq(match, ctx, locale);
  }

  switch (match.intent) {
    case "tour":
      return composeTourStep(0, locale);
    case "peringatan":
      return composePeringatan(ctx, locale);
    case "cuaca":
      return composeCuaca(match, ctx, locale);
    case "lapor":
      return composeLapor(locale);
    case "peta":
      return composePeta(locale);
    case "destana":
      return composeDestana(match, ctx, locale);
    case "nomor":
      return composeNomor(ctx, locale);
    case "kejadian":
      return composeKejadian(match, ctx, locale);
    case "dibi":
      return composeDibi(ctx, locale);
    case "anggaran":
      return composeAnggaran(ctx, locale);
    case "irbi":
      return composeIrbi(match, ctx, locale);
    case "krb":
      return composeKrb(match, ctx, locale);
    case "pelatihan":
      return composePelatihan(ctx, locale);
    case "mitra":
      return composeMitra(ctx, locale);
    case "publikasi":
      return composePublikasi(ctx, locale);
    case "metodologi":
      return composeMetodologi(locale);
    case "tentang":
      return composeTentang(ctx, locale);
    default:
      return composeUnknown(match, locale);
  }
}

export function composeTourStep(index: number, locale: GuideLocale): GuideAnswer {
  const safe = Math.max(0, Math.min(index, HOME_TOUR_STEPS.length - 1));
  const step = HOME_TOUR_STEPS[safe];
  const last = safe === HOME_TOUR_STEPS.length - 1;
  const bodies: Record<(typeof HOME_TOUR_STEPS)[number]["copyKey"], { id: string; en: string }> = {
    tourHero: {
      id: "Beranda: status Aceh, peta, dan pintu lapor. Ini titik awal observatorium.",
      en: "Home: Aceh’s status, the map, and the report door. This is the observatory start.",
    },
    tourStatus: {
      id: "Peringatan dini: empat kartu mandiri — cuaca, MAGMA, Sipongi, dan Tatonas (muka air). Kartu yang gagal tidak mengisi angka palsu.",
      en: "Early warning: four independent cards — weather, MAGMA, Sipongi, and Tatonas (water level). A failed card does not invent numbers.",
    },
    tourCuaca: {
      id: "Strip cuaca merangkum prakiraan kab/kota. Hanya kondisi yang perlu perhatian yang jadi peringatan.",
      en: "The weather strip summarises kab/kota forecasts. Only conditions that need attention become warnings.",
    },
    tourSik: {
      id: "Angka SIK publik: kejadian operasional yang sudah berstatus aktif atau selesai, bukan draf staf.",
      en: "Public SIK figures: operational events marked active or closed — not staff drafts.",
    },
    tourDibi: {
      id: "Dasbor DIBI BNPB untuk Aceh: rekap historis, bukan status darurat hari ini.",
      en: "BNPB DIBI dashboard for Aceh: historical totals, not today’s emergency status.",
    },
    tourPrrpka: {
      id: "Panel R3P/PRRPKA menampilkan rencana rehab-rekon. Metodologi pencocokan desa ada di halaman Metodologi.",
      en: "The R3P/PRRPKA panel shows rehab-recon planning. Village matching is explained on Methodology.",
    },
    tourPeta: {
      id: "Teaser peta. Peta penuh adalah ruang kerja, bukan halaman pemasaran.",
      en: "Map teaser. The full map is a workspace, not a marketing page.",
    },
    tourLapor: {
      id: "Warga bisa mengirim laporan kejadian atau penanganan. Laporan dimoderasi sebelum tampil di peta.",
      en: "Residents can send incident or response reports. Reports are moderated before they appear on the map.",
    },
    tourTransparansi: {
      id: "Bagian transparansi mengarah ke sumber data dan metodologi. Selesai tur beranda — lanjut ke halaman lain bila perlu.",
      en: "Transparency points to data sources and methodology. Home tour done — continue to other pages if needed.",
    },
  };
  const copy = bodies[step.copyKey];
  const links: GuideLink[] = last
    ? [
        link("/destana", "linkDestana"),
        link("/nomor-penting", "linkNomor"),
        link("/lapor/kejadian", "linkLapor", { accent: true }),
      ]
    : [link("/", "linkSection", { hash: step.hash })];

  return {
    intent: "tour",
    body: t(locale, copy.id, copy.en),
    links,
    tour: { href: "/", hash: step.hash },
  };
}

function composeFaq(match: GuideMatch, ctx: GuideContext, locale: GuideLocale): GuideAnswer {
  const faq = match.faq;
  if (!faq) return composeUnknown(match, locale);
  const live =
    match.intent === "peringatan" && ctx.peringatan && !ctx.failed.includes("peringatan")
      ? composePeringatan(ctx, locale).body
      : match.intent === "destana" && (ctx.destanaDesa || ctx.destana)
        ? composeDestana(match, ctx, locale).body
        : "";
  return {
    intent: match.intent,
    body: [t(locale, faq.bodyId, faq.bodyEn), live].filter(Boolean).join(" "),
    links: [
      link(faq.href, faq.labelKey, {
        hash: faq.hash,
        accent: faq.href.startsWith("/lapor"),
      }),
    ],
    source: t(locale, "FAQ kurasi situs", "Curated site FAQ"),
  };
}

function composeUnknown(match: GuideMatch, locale: GuideLocale): GuideAnswer {
  if (match.reason === "emergency") {
    return {
      intent: "unknown",
      body: t(
        locale,
        "Jika ini darurat, segera buka nomor penting atau hubungi 112. Anda juga bisa mengirim laporan kejadian. Saya tidak memberi perintah evakuasi atau mengarang status siaga.",
        "If this is an emergency, open the official contacts or call 112. You can also submit an incident report. I do not issue evacuation orders or invent alert levels."
      ),
      links: fallbackLinks(locale),
    };
  }
  if (match.reason === "out_of_scope") {
    return {
      intent: "unknown",
      body: t(
        locale,
        "Panduan ini hanya mencakup bencana dan layanan di Provinsi Aceh. Untuk wilayah lain, saya tidak punya sumber resmi di situs ini.",
        "This guide only covers disasters and services in Aceh Province. I have no official source here for other regions."
      ),
      links: fallbackLinks(locale),
    };
  }
  return {
    intent: "unknown",
    body: t(
      locale,
      "Saya hanya menjawab dari sumber resmi di situs ini: navigasi halaman atau riset dari cuplikan yang sudah ada. Saya tidak mengarang angka korban, SK darurat, atau perintah evakuasi. Coba bandingkan Destana dan IRBI, atau tanya cara membaca DIBI.",
      "I only answer from official sources on this site: page navigation or research from snippets already here. I do not invent casualty figures, emergency decrees, or evacuation orders. Try comparing Destana and IRBI, or ask how to read DIBI."
    ),
    links: fallbackLinks(locale),
  };
}

function composePeringatan(ctx: GuideContext, locale: GuideLocale): GuideAnswer {
  if (ctx.failed.includes("peringatan") || !ctx.peringatan) {
    return {
      intent: "peringatan",
      body: failedNote(locale, t(locale, "peringatan dini", "early warning")),
      links: [link("/", "linkPeringatan", { hash: "status" })],
    };
  }
  const p = ctx.peringatan;
  const cuaca = p.cuacaEmpty
    ? t(locale, "Cuaca: tidak ada peringatan ekstrem.", "Weather: no extreme warning.")
    : t(locale, `Cuaca: ${p.cuacaHighlight}.`, `Weather: ${p.cuacaHighlight}.`);
  const magma = p.magmaEmpty
    ? t(locale, "Gempa MAGMA: tidak ada kejadian Aceh yang tampil, atau umpan tertunda.", "MAGMA quake: no Aceh event shown, or the feed is delayed.")
    : t(locale, `Gempa MAGMA: ${p.magmaSummary}.`, `MAGMA quake: ${p.magmaSummary}.`);
  const sipongi = p.sipongiEmpty
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
  return {
    intent: "peringatan",
    body: [cuaca, magma, sipongi, tatonas].join(" ") + staleNote(locale, p.stale),
    links: [link("/", "linkPeringatan", { hash: "status" }), link("/peta", "linkPeta")],
    source: t(locale, "Peringatan dini situs", "Site early warning"),
  };
}

function composeCuaca(match: GuideMatch, ctx: GuideContext, locale: GuideLocale): GuideAnswer {
  const parts: string[] = [];
  if (ctx.peringatan) {
    parts.push(
      ctx.peringatan.cuacaEmpty
        ? t(locale, "Tidak ada peringatan cuaca ekstrem di kartu beranda.", "No extreme weather warning on the home cards.")
        : t(locale, `Peringatan cuaca: ${ctx.peringatan.cuacaHighlight}.`, `Weather warning: ${ctx.peringatan.cuacaHighlight}.`)
    );
  } else if (ctx.failed.includes("peringatan")) {
    parts.push(failedNote(locale, t(locale, "peringatan cuaca", "weather warning")));
  }

  if (ctx.weather) {
    const temp =
      ctx.weather.tempC == null
        ? ""
        : t(locale, ` Suhu ${ctx.weather.tempC}°C.`, ` Temperature ${ctx.weather.tempC}°C.`);
    parts.push(
      t(
        locale,
        `Prakiraan ${ctx.weather.kabupaten}: ${ctx.weather.desc}.${temp}`,
        `Forecast for ${ctx.weather.kabupaten}: ${ctx.weather.desc}.${temp}`
      )
    );
  } else if (match.kabupaten && ctx.failed.includes("weather")) {
    parts.push(failedNote(locale, t(locale, "prakiraan cuaca", "weather forecast")));
  } else if (match.kabupaten && !ctx.weather) {
    parts.push(
      t(
        locale,
        `Tidak ada baris prakiraan yang cocok untuk ${match.kabupaten}.`,
        `No forecast row matched ${match.kabupaten}.`
      )
    );
  }

  if (parts.length === 0) {
    parts.push(failedNote(locale, t(locale, "cuaca", "weather")));
  }

  return {
    intent: "cuaca",
    body: parts.join(" "),
    links: [link("/", "linkCuaca", { hash: "cuaca" })],
    source: t(locale, "Cuaca situs (BMKG / Open-Meteo)", "Site weather (BMKG / Open-Meteo)"),
  };
}

function composeLapor(locale: GuideLocale): GuideAnswer {
  return {
    intent: "lapor",
    body: t(
      locale,
      "Pilih jenis laporan, isi lokasi, lalu kirim. Laporan kejadian dan penanganan tampil di peta setelah dimoderasi Pusdalops BPBA. Identitas tidak ditampilkan di peta publik.",
      "Choose a report type, add the location, then submit. Incident and response reports appear on the map after BPBA Pusdalops moderation. Identity is not shown on the public map."
    ),
    links: [
      link("/lapor/kejadian", "linkLaporKejadian", { accent: true }),
      link("/lapor/penanganan", "linkLaporPenanganan"),
      link("/", "linkLaporSection", { hash: "partisipasi" }),
    ],
  };
}

function composePeta(locale: GuideLocale): GuideAnswer {
  return {
    intent: "peta",
    body: t(
      locale,
      "Peta penuh menampilkan kejadian, fasilitas, laporan warga, dan batas wilayah. Widget panduan disembunyikan di halaman itu agar tidak menumpuk tombol lapor.",
      "The full map shows events, facilities, citizen reports, and boundaries. This guide hides on that page so it does not cover the report button."
    ),
    links: [link("/peta", "linkPeta"), link("/", "linkPetaTeaser", { hash: "peta-teaser" })],
    tour: { href: "/peta" },
  };
}

function composeDestana(match: GuideMatch, ctx: GuideContext, locale: GuideLocale): GuideAnswer {
  if (ctx.destanaDesa) {
    const d = ctx.destanaDesa;
    const place = [d.nama, d.kecamatan, d.kabupaten].filter(Boolean).join(" · ");
    const level = d.destanaLevel
      ? t(locale, ` Status Destana: ${d.destanaLevel}.`, ` Destana status: ${d.destanaLevel}.`)
      : t(
          locale,
          " Status Destana ada di halaman Destana — tidak saya isi sendiri.",
          " Destana status is on the Destana page — I will not invent it."
        );
    return {
      intent: "destana",
      body: t(
        locale,
        `Desa ${place}.${level} Ini status ketangguhan, bukan perintah evakuasi.`,
        `Village ${place}.${level} This is resilience status, not an evacuation order.`
      ),
      links: [link("/destana", "linkDestana")],
      source: t(locale, "SIK publik — Destana / profil desa", "Public SIK — Destana / village profile"),
    };
  }
  if (ctx.failed.includes("destana") || !ctx.destana) {
    return {
      intent: "destana",
      body: failedNote(locale, "Destana"),
      links: [link("/destana", "linkDestana")],
    };
  }
  const c = ctx.destana.counts;
  const scope = match.kabupaten ?? t(locale, "Aceh", "Aceh");
  return {
    intent: "destana",
    body: t(
      locale,
      `Ringkasan Destana ${scope}: belum ${c.belum ?? 0}, pratama ${c.pratama ?? 0}, madya ${c.madya ?? 0}, utama ${c.utama ?? 0}. Ini status ketangguhan desa, bukan perintah evakuasi.`,
      `Destana summary for ${scope}: not yet ${c.belum ?? 0}, pratama ${c.pratama ?? 0}, madya ${c.madya ?? 0}, utama ${c.utama ?? 0}. This is village resilience status, not an evacuation order.`
    ),
    links: [link("/destana", "linkDestana")],
    source: t(locale, "SIK publik — Destana", "Public SIK — Destana"),
  };
}

function composeNomor(ctx: GuideContext, locale: GuideLocale): GuideAnswer {
  if (ctx.failed.includes("nomor") || !ctx.nomor) {
    return {
      intent: "nomor",
      body: failedNote(locale, t(locale, "nomor penting", "emergency contacts")),
      links: [link("/nomor-penting", "linkNomor"), link("/lapor/kejadian", "linkLapor", { accent: true })],
    };
  }
  if (ctx.nomor.length === 0) {
    return {
      intent: "nomor",
      body: t(
        locale,
        "Belum ada nomor yang dipublikasikan di katalog resmi. Untuk darurat nasional, hubungi 112, lalu periksa halaman nomor penting lagi.",
        "No numbers are published in the official catalogue yet. For a national emergency call 112, then check the contacts page again."
      ),
      links: [link("/nomor-penting", "linkNomor")],
    };
  }
  const lines = ctx.nomor
    .map((row) => `${row.nama}: ${row.telepon}`)
    .join(locale === "en" ? "; " : "; ");
  return {
    intent: "nomor",
    body: t(
      locale,
      `Nomor yang dipublikasikan: ${lines}. Daftar lengkap ada di halaman nomor penting.`,
      `Published numbers: ${lines}. The full list is on the contacts page.`
    ),
    links: [link("/nomor-penting", "linkNomor")],
    source: t(locale, "SIK publik — nomor penting", "Public SIK — contacts"),
  };
}

function composeKejadian(match: GuideMatch, ctx: GuideContext, locale: GuideLocale): GuideAnswer {
  const parts: string[] = [];
  if (ctx.liveStats) {
    parts.push(
      t(
        locale,
        `Kejadian aktif tercatat ${ctx.liveStats.activeIncidents}; laporan 24 jam ${ctx.liveStats.reportsLast24h}.`,
        `Recorded active incidents: ${ctx.liveStats.activeIncidents}; reports in 24 hours: ${ctx.liveStats.reportsLast24h}.`
      )
    );
  } else if (ctx.failed.includes("liveStats")) {
    parts.push(failedNote(locale, t(locale, "statistik live", "live stats")));
  }

  if (ctx.sikStats) {
    const top = ctx.sikStats.byJenis[0];
    parts.push(
      t(
        locale,
        `SIK ${ctx.sikStats.year}: ${ctx.sikStats.total} kejadian operasional${top ? `, teratas ${top.jenis} (${top.count})` : ""}.`,
        `SIK ${ctx.sikStats.year}: ${ctx.sikStats.total} operational events${top ? `, top ${top.jenis} (${top.count})` : ""}.`
      )
    );
  } else if (ctx.failed.includes("sikStats")) {
    parts.push(failedNote(locale, "SIK"));
  }

  if (ctx.kejadian) {
    const filterBits = [match.kabupaten, match.jenis, match.year ? String(match.year) : ""]
      .filter(Boolean)
      .join(", ");
    const sample = ctx.kejadian.items
      .slice(0, 3)
      .map((item) => [item.jenis, item.kabupaten, item.tanggal].filter(Boolean).join(" · "))
      .filter(Boolean);
    parts.push(
      t(
        locale,
        `Katalog kejadian${filterBits ? ` (${filterBits})` : ""}: ${ctx.kejadian.total} baris.${sample.length ? ` Contoh: ${sample.join("; ")}.` : ""}`,
        `Event catalogue${filterBits ? ` (${filterBits})` : ""}: ${ctx.kejadian.total} rows.${sample.length ? ` Examples: ${sample.join("; ")}.` : ""}`
      )
    );
  } else if (ctx.failed.includes("kejadian")) {
    parts.push(failedNote(locale, t(locale, "katalog kejadian", "event catalogue")));
  }

  if (parts.length === 0) {
    parts.push(failedNote(locale, t(locale, "kejadian", "incidents")));
  }

  return {
    intent: "kejadian",
    body: parts.join(" "),
    links: [link("/data-bencana", "linkDataBencana"), link("/peta", "linkPeta")],
    source: t(locale, "SIK publik + katalog kejadian", "Public SIK + event catalogue"),
  };
}

function composeDibi(ctx: GuideContext, locale: GuideLocale): GuideAnswer {
  if (ctx.failed.includes("dibi") || !ctx.dibi) {
    return {
      intent: "dibi",
      body: failedNote(locale, "DIBI"),
      links: [link("/", "linkDibi", { hash: "dibi" }), link("/sumber-data", "linkSumber")],
    };
  }
  const d = ctx.dibi;
  const top = d.topKategori
    ? t(locale, ` Kategori teratas: ${d.topKategori}.`, ` Top category: ${d.topKategori}.`)
    : "";
  const dead =
    typeof d.meninggal === "number"
      ? t(locale, ` Meninggal (DIBI): ${d.meninggal}.`, ` Deaths (DIBI): ${d.meninggal}.`)
      : "";
  return {
    intent: "dibi",
    body: t(
      locale,
      `DIBI BNPB Aceh ${d.yearFrom}–${d.yearTo}: ${d.kejadian} kejadian.${top}${dead} Ini rekap historis, bukan status darurat hari ini.`,
      `BNPB DIBI Aceh ${d.yearFrom}–${d.yearTo}: ${d.kejadian} events.${top}${dead} Historical totals, not today’s emergency status.`
    ),
    links: [link("/", "linkDibi", { hash: "dibi" }), link("/sumber-data", "linkSumber")],
    source: t(locale, "DIBI BNPB", "BNPB DIBI"),
  };
}

function composeAnggaran(ctx: GuideContext, locale: GuideLocale): GuideAnswer {
  if (ctx.failed.includes("anggaran") || !ctx.anggaran) {
    return {
      intent: "anggaran",
      body: failedNote(locale, t(locale, "anggaran", "budget")),
      links: [link("/anggaran-bencana", "linkAnggaran")],
    };
  }
  const loc = locale === "en" ? "en-US" : "id-ID";
  return {
    intent: "anggaran",
    body: t(
      locale,
      `Anggaran penanganan ${ctx.anggaran.tahun}: ${formatRpCompact(ctx.anggaran.totalRp, loc)} pada ${ctx.anggaran.kegiatan} kegiatan (analisis situs). Rincian fase dan SKPD ada di halaman anggaran.`,
      `Response budget ${ctx.anggaran.tahun}: ${formatRpCompact(ctx.anggaran.totalRp, loc)} across ${ctx.anggaran.kegiatan} activities (site analysis). Phase and SKPD detail is on the budget page.`
    ),
    links: [link("/anggaran-bencana", "linkAnggaran")],
    source: t(locale, "Analisis anggaran situs", "Site budget analysis"),
  };
}

function composeIrbi(match: GuideMatch, ctx: GuideContext, locale: GuideLocale): GuideAnswer {
  if (ctx.failed.includes("irbi") || !ctx.irbi) {
    return {
      intent: "irbi",
      body: failedNote(locale, "IRBI"),
      links: [link("/", "linkIrbi", { hash: "hero" }), link("/metodologi", "linkMetodologi")],
    };
  }
  const i = ctx.irbi;
  if (match.kabupaten && i.kab && i.kelas) {
    const score = typeof i.irb === "number" ? ` (IRB ${i.irb})` : "";
    return {
      intent: "irbi",
      body: t(
        locale,
        `IRBI 2025 ${i.kab}: kelas ${i.kelas}${score}. Ini kelas indeks risiko, bukan zona KRB I/II/III dan bukan status darurat.`,
        `IRBI 2025 ${i.kab}: class ${i.kelas}${score}. This is a risk-index class, not a KRB I/II/III zone and not an emergency status.`
      ),
      links: [link("/peta", "linkPeta"), link("/metodologi", "linkMetodologi")],
      source: t(locale, "IRBI 2025", "IRBI 2025"),
    };
  }
  if (match.kabupaten && !i.kab) {
    return {
      intent: "irbi",
      body: t(
        locale,
        `Tidak ada baris IRBI yang cocok untuk ${match.kabupaten}. Kelas provinsi tercantum di katalog IRBI 2025.`,
        `No IRBI row matched ${match.kabupaten}. The province class is listed in the IRBI 2025 catalogue.`
      ),
      links: [link("/metodologi", "linkMetodologi")],
      source: t(locale, "IRBI 2025", "IRBI 2025"),
    };
  }
  const kelas = i.provinsiKelas ?? t(locale, "lihat katalog", "see catalogue");
  const irb = typeof i.provinsiIrb === "number" ? ` (IRB ${i.provinsiIrb})` : "";
  return {
    intent: "irbi",
    body: t(
      locale,
      `IRBI 2025 Provinsi Aceh: kelas ${kelas}${irb}. Bukan peta zona KRB operasional.`,
      `IRBI 2025 Aceh Province: class ${kelas}${irb}. Not an operational KRB zone map.`
    ),
    links: [link("/peta", "linkPeta"), link("/metodologi", "linkMetodologi")],
    source: t(locale, "IRBI 2025", "IRBI 2025"),
  };
}

function composeKrb(match: GuideMatch, ctx: GuideContext, locale: GuideLocale): GuideAnswer {
  const irbiNote = ctx.irbi?.kab && ctx.irbi.kelas
    ? t(
        locale,
        ` Kelas IRBI ${ctx.irbi.kab}: ${ctx.irbi.kelas}.`,
        ` IRBI class for ${ctx.irbi.kab}: ${ctx.irbi.kelas}.`
      )
    : "";
  const count =
    typeof ctx.krb?.kawasanCount === "number"
      ? t(
          locale,
          ` Katalog mencantumkan ${ctx.krb.kawasanCount} kawasan bernama${match.kabupaten ? ` untuk filter ${match.kabupaten}` : ""}.`,
          ` The catalogue lists ${ctx.krb.kawasanCount} named areas${match.kabupaten ? ` for ${match.kabupaten}` : ""}.`
        )
      : "";
  if (ctx.failed.includes("krb") && !ctx.irbi) {
    return {
      intent: "krb",
      body: failedNote(locale, "KRB / IRBI"),
      links: [link("/metodologi", "linkMetodologi")],
    };
  }
  return {
    intent: "krb",
    body: t(
      locale,
      `Situs ini menampilkan kelas IRBI, bukan zona KRB I/II/III. Poligon resmi tetap di InaRISK/PVMBG.${count}${irbiNote}`,
      `This site shows IRBI classes, not KRB I/II/III zones. Official polygons stay on InaRISK/PVMBG.${count}${irbiNote}`
    ),
    links: [link("/metodologi", "linkMetodologi"), link("/peta", "linkPeta")],
    source: t(locale, "Katalog IRBI/KRB situs", "Site IRBI/KRB catalogue"),
  };
}

function composePelatihan(ctx: GuideContext, locale: GuideLocale): GuideAnswer {
  if (ctx.failed.includes("pelatihan") || !ctx.pelatihan) {
    return {
      intent: "pelatihan",
      body: failedNote(locale, t(locale, "pelatihan", "training")),
      links: [link("/pelatihan", "linkPelatihan")],
    };
  }
  if (ctx.pelatihan.length === 0) {
    return {
      intent: "pelatihan",
      body: t(
        locale,
        "Belum ada pelatihan yang dipublikasikan di katalog resmi. Halaman Pelatihan tetap tempat meminta jadwal.",
        "No training items are published in the official catalogue yet. The Training page is still where you request a schedule."
      ),
      links: [link("/pelatihan", "linkPelatihan")],
    };
  }
  const lines = ctx.pelatihan
    .map((row) => [row.judul, row.tanggal, row.status].filter(Boolean).join(" · "))
    .join("; ");
  return {
    intent: "pelatihan",
    body: t(
      locale,
      `Pelatihan yang dipublikasikan (cuplikan): ${lines}. Daftar lengkap dan permintaan ada di halaman Pelatihan.`,
      `Published training (sample): ${lines}. The full list and requests are on the Training page.`
    ),
    links: [link("/pelatihan", "linkPelatihan")],
    source: t(locale, "SIK publik — pelatihan", "Public SIK — training"),
  };
}

function composeMitra(ctx: GuideContext, locale: GuideLocale): GuideAnswer {
  if (ctx.failed.includes("mitra") || !ctx.mitra) {
    return {
      intent: "mitra",
      body: failedNote(locale, t(locale, "mitra", "partners")),
      links: [link("/mitra", "linkMitra")],
    };
  }
  if (ctx.mitra.length === 0) {
    return {
      intent: "mitra",
      body: t(
        locale,
        "Belum ada lembaga mitra yang dipublikasikan. Buka halaman Mitra untuk katalog resmi.",
        "No partner organisations are published yet. Open the Partners page for the official catalogue."
      ),
      links: [link("/mitra", "linkMitra")],
    };
  }
  const names = ctx.mitra.map((row) => row.judul).join("; ");
  return {
    intent: "mitra",
    body: t(
      locale,
      `Mitra yang dipublikasikan (cuplikan): ${names}. Catatan operasional ada di halaman Mitra.`,
      `Published partners (sample): ${names}. Operational notes are on the Partners page.`
    ),
    links: [link("/mitra", "linkMitra")],
    source: t(locale, "SIK publik — mitra", "Public SIK — partners"),
  };
}

function composePublikasi(ctx: GuideContext, locale: GuideLocale): GuideAnswer {
  if (ctx.failed.includes("publikasi") || !ctx.publikasi) {
    return {
      intent: "publikasi",
      body: failedNote(locale, t(locale, "publikasi", "publications")),
      links: [link("/publikasi", "linkPublikasi")],
    };
  }
  const lines = ctx.publikasi
    .map((row) => `${row.title} (${row.channel === "kegiatan" ? "kegiatan BPBA" : "analisis"})`)
    .join("; ");
  return {
    intent: "publikasi",
    body: t(
      locale,
      `Dua kanal resmi: analisis kebijakan dan kegiatan BPBA. Cuplikan: ${lines}.`,
      `Two official channels: policy analysis and BPBA field activities. Sample: ${lines}.`
    ),
    links: [link("/publikasi", "linkPublikasi")],
    source: t(locale, "Publikasi situs", "Site publications"),
  };
}

function composeMetodologi(locale: GuideLocale): GuideAnswer {
  const dibi = DATA_SOURCES.find((row) => row.id === "dibi-aceh");
  const kejadian = DATA_SOURCES.find((row) => row.id === "kejadian-bencana");
  const bits = [dibi?.titleId, kejadian?.titleId].filter(Boolean).join("; ");
  return {
    intent: "metodologi",
    body: t(
      locale,
      `Sumber yang diindeks situs antara lain: ${bits}. Inventaris lengkap dan cara gabung data ada di Sumber data dan Metodologi.`,
      `Sources indexed by the site include DIBI Aceh and the compiled event catalogue. Full inventory and join methods are on Data sources and Methodology.`
    ),
    links: [link("/sumber-data", "linkSumber"), link("/metodologi", "linkMetodologi")],
    source: t(locale, "Katalog sumber data situs", "Site data-source catalogue"),
  };
}

function composeTentang(ctx: GuideContext, locale: GuideLocale): GuideAnswer {
  const live = ctx.liveStats
    ? t(
        locale,
        ` Saat ini tercatat ${ctx.liveStats.activeIncidents} kejadian aktif dan ${ctx.liveStats.reportsLast24h} laporan/24 jam.`,
        ` Currently recorded: ${ctx.liveStats.activeIncidents} active incidents and ${ctx.liveStats.reportsLast24h} reports/24h.`
      )
    : "";
  return {
    intent: "tentang",
    body: t(
      locale,
      `Aceh Tangguh adalah observatorium dan SIK publik untuk kesiapsiagaan serta penanganan bencana di Aceh.${live} Saya memandu halaman situs dan merangkai riset dari sumber resmi di sini — bukan pengganti 112 atau Pusdalops.`,
      `Aceh Tangguh is a public observatory and SIK for preparedness and disaster response in Aceh.${live} I guide the site and rephrase research from official sources here — not a substitute for 112 or Pusdalops.`
    ),
    links: [
      link("/", "linkMulaiTur", { hash: "hero" }),
      link("/nomor-penting", "linkNomor"),
      link("/lapor/kejadian", "linkLapor", { accent: true }),
    ],
    tour: { href: "/", hash: "hero" },
  };
}
