"use client";

import { Suspense, useEffect, useState } from "react";
import { useMapUrlState } from "@/hooks/useMapUrlState";
import { SiteNav } from "@/components/SiteNav";
import { MapToolbar } from "@/components/map/MapToolbar";
import { MapSettings } from "@/components/map/MapSettings";
import { MapViewport } from "@/components/map/MapViewport";
import { AreaProfilPanel } from "@/components/map/AreaProfilPanel";
import { ReportFAB } from "@/components/map/ReportFAB";
import { StatusLegend } from "@/components/map/StatusLegend";
import type { VillageClickSelection } from "@/lib/profil-desa";
import { isAdminLodArea } from "@/lib/village-distribution-lod";

function MapWorkspaceInner() {
  const {
    state,
    setView,
    setBasemap,
    setPreferVector,
    setAreaLayer,
    setKrbJenis,
    toggleMarkerLayer,
    toggleDisasterJenis,
    toggleFasilitasUmum,
    toggleOverlay,
    toggleNasaLayer,
    setNasaDate,
  } = useMapUrlState();
  const [villageSelection, setVillageSelection] =
    useState<VillageClickSelection | null>(null);
  const [lodSelection, setLodSelection] =
    useState<VillageClickSelection | null>(null);

  useEffect(() => {
    setVillageSelection(null);
    setLodSelection(null);
  }, [state.areaLayer]);

  const onVillageClick = (sel: VillageClickSelection) => {
    setVillageSelection(sel);
    setLodSelection(sel);
  };

  return (
    <div className="relative h-[100svh] w-full overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <MapViewport
        view={state.view}
        onViewChange={setView}
        basemap={state.basemap}
        preferVector={state.preferVector}
        markerLayers={state.markerLayers}
        areaLayer={state.areaLayer}
        krbJenis={state.krbJenis ?? null}
        disasterJenis={state.disasterJenis}
        villageSelection={lodSelection ?? villageSelection}
        onVillageClick={onVillageClick}
        overlays={state.overlays}
        nasaLayers={state.nasaLayers}
        nasaDate={state.nasaDate}
      />
      {villageSelection && isAdminLodArea(state.areaLayer) ? (
        <AreaProfilPanel
          selection={villageSelection}
          variant={state.areaLayer === "r3pDistribution" ? "r3p" : "desa"}
          onClose={() => {
            setVillageSelection(null);
            setLodSelection(null);
          }}
          onNavigate={setLodSelection}
        />
      ) : null}
      <SiteNav />
      <StatusLegend className="absolute left-3 top-[5.75rem] z-20 w-[min(16rem,calc(100vw-4.5rem))] md:hidden" />
      <MapToolbar
        areaLayer={state.areaLayer}
        krbJenis={state.krbJenis ?? null}
        onKrbJenisChange={setKrbJenis}
        onAreaLayerChange={setAreaLayer}
        markerLayers={state.markerLayers}
        onToggleMarker={toggleMarkerLayer}
        disasterJenis={state.disasterJenis}
        onToggleDisasterJenis={toggleDisasterJenis}
        onToggleFasilitasUmum={toggleFasilitasUmum}
        overlays={state.overlays}
        onToggleOverlay={toggleOverlay}
        nasaLayers={state.nasaLayers}
        nasaDate={state.nasaDate}
        onToggleNasaLayer={toggleNasaLayer}
        onNasaDateChange={setNasaDate}
      />
      <div className="pointer-events-none absolute bottom-[5.75rem] left-3 z-30 flex flex-col items-start gap-3 sm:bottom-6 md:bottom-4 md:left-4">
        <MapSettings
          basemap={state.basemap}
          onBasemapChange={setBasemap}
          preferVector={state.preferVector}
          onPreferVectorChange={setPreferVector}
          className="pointer-events-auto static bottom-auto left-auto sm:bottom-auto"
        />
        <StatusLegend className="pointer-events-auto hidden md:block" />
      </div>
      <ReportFAB />
    </div>
  );
}

export function MapWorkspace() {
  return (
    <Suspense
      fallback={
        <div className="grid h-[100svh] place-items-center bg-[var(--bg)] text-sm text-[var(--text-dim)]">
          Memuat peta…
        </div>
      }
    >
      <MapWorkspaceInner />
    </Suspense>
  );
}
