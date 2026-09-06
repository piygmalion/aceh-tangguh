import { setRequestLocale } from "next-intl/server";
import { ClusterGrid } from "@/components/ClusterGrid";
import { R3PChartSection } from "@/components/R3PChartSection";
import { PeringatanDiniSection } from "@/components/PeringatanDiniSection";
import { WeatherStrip } from "@/components/weather/WeatherStrip";
import { WeatherInovasiStrip } from "@/components/weather/WeatherInovasiStrip";
import { HeroSection } from "@/components/HeroSection";
import { MapTeaserSection } from "@/components/MapTeaserSection";
import { ParticipationSection } from "@/components/ParticipationSection";
import { OperationalStatsSection } from "@/components/sik/OperationalStatsSection";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/SiteNav";
import { TransparencySection } from "@/components/TransparencySection";

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
        <HeroSection />
        <PeringatanDiniSection />
        <WeatherStrip />
        <WeatherInovasiStrip />
        <OperationalStatsSection />
        <ClusterGrid />
        <R3PChartSection />
        <MapTeaserSection />
        <ParticipationSection />
        <TransparencySection />
      </main>
      <SiteFooter />
    </>
  );
}
