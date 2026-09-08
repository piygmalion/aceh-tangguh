"use client";

import Image from "next/image";
import { Layers, MapPin, Radio } from "lucide-react";
import { Link } from "@/i18n/routing";
import { SITE_MEDIA } from "@/lib/media";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { rapikanTanda } from "./format";
import { SectionHeading } from "./primitives";

const LAPISAN = [
  {
    key: "disasterEvents" as const,
    nama: "Kejadian bencana",
    isi: "Titik kejadian terverifikasi beserta kronologi dan dampaknya",
    Icon: Radio,
  },
  {
    key: "facHealth" as const,
    nama: "Fasilitas kesehatan",
    isi: "Rumah sakit dan puskesmas rujukan saat tanggap darurat",
    Icon: MapPin,
  },
  {
    key: "laporanKejadian" as const,
    nama: "Laporan warga",
    isi: "Kiriman masyarakat yang sudah lolos moderasi petugas",
    Icon: Layers,
  },
];

export function PetaPanel() {
  // Aceh documentation only. Generic island stock would misrepresent the coverage area.
  const foto = SITE_MEDIA.heroSlides[3];

  return (
    <section id="peta" className="scroll-mt-24 px-4 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          title="Satu peta untuk seluruh operasional"
          lead="Bahaya, kerentanan, fasilitas, dan laporan lapangan berada pada basemap yang sama, sehingga keputusan penanganan tidak perlu berpindah aplikasi."
        />

        <div className="mt-8 grid gap-3 lg:grid-cols-12">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] lg:col-span-7">
            <div className="relative aspect-[16/10] sm:aspect-[16/9]">
              <Image
                src={foto.src}
                alt={rapikanTanda(foto.alt)}
                fill
                sizes="(max-width: 1024px) 100vw, 660px"
                className="object-cover"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#1A1A17] via-[#1A1A17]/35 to-[#1A1A17]/10"
                aria-hidden
              />

              <div className="absolute inset-x-0 bottom-0 p-5">
                <p className="max-w-md text-[0.9375rem] leading-relaxed text-white/85">
                  Choropleth risiko per kabupaten, titik posko dan pengungsian, serta
                  kawasan rawan bencana dalam satu tampilan.
                </p>
                <Link
                  href="/peta"
                  className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-6 text-sm font-semibold text-[var(--accent-fg)] transition hover:bg-[var(--accent-hover)]"
                >
                  Buka peta penuh
                </Link>
              </div>
            </div>
          </div>

          <ul className="grid gap-3 lg:col-span-5">
            {LAPISAN.map(({ key, nama, isi, Icon }) => (
              <li key={key} className="h-full">
                <Link
                  href={{ pathname: "/peta", query: { layers: key } }}
                  className="flex h-full items-start gap-3.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 transition hover:border-[var(--primary)] hover:shadow-[var(--shadow)]"
                >
                  <span
                    className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--primary-dim)] text-[var(--primary)]"
                    aria-hidden
                  >
                    <Icon size={17} strokeWidth={2} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.9375rem] font-semibold">{nama}</span>
                    <span
                      className={cn(
                        "mt-1 block leading-relaxed text-[var(--text-dim)]",
                        TYPE_FLOOR_CLASS,
                      )}
                    >
                      {isi}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <p className={cn("mt-4 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
          {rapikanTanda(SITE_MEDIA.heroPoster.credit)}
        </p>
      </div>
    </section>
  );
}
