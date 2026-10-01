import { setRequestLocale } from "next-intl/server";
import { BeritaSection } from "@/components/beranda/BeritaSection";
import { CuacaStrip } from "@/components/beranda/CuacaStrip";
import { DataHero } from "@/components/beranda/DataHero";
import { DestanaBeranda } from "@/components/beranda/DestanaBeranda";
import { FiturSection } from "@/components/beranda/FiturSection";
import { LaporCta } from "@/components/beranda/LaporCta";
import { MasukCta } from "@/components/beranda/MasukCta";
import { PeringatanBento } from "@/components/beranda/PeringatanBento";
import { RisikoLadder } from "@/components/beranda/RisikoLadder";
import { SumberPanel } from "@/components/beranda/SumberPanel";
import { TentangSection } from "@/components/beranda/TentangSection";
import { SHOW_BERANDA_DESTANA } from "@/components/beranda/flags";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";

export default async function HomePage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);

  return (
    <>
      <SiteNav />
      <main className="overflow-x-hidden">
        <DataHero />
        <TentangSection />
        <LaporCta />
        <FiturSection />
        {SHOW_BERANDA_DESTANA ? <DestanaBeranda /> : null}
        <RisikoLadder />
        <BeritaSection />
        <CuacaStrip />
        <PeringatanBento />
        <SumberPanel />
        <MasukCta />
      </main>
      <SiteFooter />
    </>
  );
}
