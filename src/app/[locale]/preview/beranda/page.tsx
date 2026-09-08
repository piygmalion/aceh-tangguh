import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { AksiPanel } from "@/components/preview/beranda-alt/AksiPanel";
import { CuacaStrip } from "@/components/preview/beranda-alt/CuacaStrip";
import { DibiPanel } from "@/components/preview/beranda-alt/DibiPanel";
import { HeroBoard } from "@/components/preview/beranda-alt/HeroBoard";
import { MetricRail } from "@/components/preview/beranda-alt/MetricRail";
import { PemulihanPanel } from "@/components/preview/beranda-alt/PemulihanPanel";
import { PeringatanBento } from "@/components/preview/beranda-alt/PeringatanBento";
import { PetaPanel } from "@/components/preview/beranda-alt/PetaPanel";
import { PitaPratinjau } from "@/components/preview/beranda-alt/PitaPratinjau";
import { RisikoLadder } from "@/components/preview/beranda-alt/RisikoLadder";
import { SumberPanel } from "@/components/preview/beranda-alt/SumberPanel";
import { routing } from "@/i18n/routing";

export const metadata: Metadata = {
  title: "Pratinjau beranda alternatif, Aceh Tangguh",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Design study for a more informative beranda. Same Aceh colour tokens as production,
 * rebuilt information hierarchy. Copy is inline Indonesian while the layout is under
 * review; it moves into `messages/*.json` if this design is adopted.
 */
export default async function PratinjauBerandaPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);

  return (
    <>
      <SiteNav />
      <main className="overflow-x-hidden">
        <HeroBoard />
        <MetricRail />
        <CuacaStrip />
        <PeringatanBento />
        <RisikoLadder />
        <DibiPanel />
        <PemulihanPanel />
        <PetaPanel />
        <AksiPanel />
        <SumberPanel />
      </main>
      <SiteFooter />
      <PitaPratinjau />
    </>
  );
}
