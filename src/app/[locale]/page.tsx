import { setRequestLocale } from "next-intl/server";
import { AksiPanel } from "@/components/beranda/AksiPanel";
import { CuacaStrip } from "@/components/beranda/CuacaStrip";
import { DibiPanel } from "@/components/beranda/DibiPanel";
import { HeroBoard } from "@/components/beranda/HeroBoard";
import { MetricRail } from "@/components/beranda/MetricRail";
import { PeringatanBento } from "@/components/beranda/PeringatanBento";
import { PetaPanel } from "@/components/beranda/PetaPanel";
import { RisikoLadder } from "@/components/beranda/RisikoLadder";
import { SumberPanel } from "@/components/beranda/SumberPanel";
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
        <HeroBoard />
        <MetricRail />
        <CuacaStrip />
        <PeringatanBento />
        <RisikoLadder />
        <DibiPanel />
        <PetaPanel />
        <AksiPanel />
        <SumberPanel />
      </main>
      <SiteFooter />
    </>
  );
}
