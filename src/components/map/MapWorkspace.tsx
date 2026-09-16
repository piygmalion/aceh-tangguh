"use client";

import { Suspense, useEffect, useState } from "react";
import { useMapUrlState } from "@/hooks/useMapUrlState";
import { SiteNav } from "@/components/SiteNav";
import { MapToolbar } from "@/components/map/MapToolbar";
import { MapSettings } from "@/components/map/MapSettings";
import { MapViewport } from "@/components/map/MapViewport";
import { AreaProfilPanel } from "@/components/map/AreaProfilPanel";
import { ReportFAB } from "@/components/map/ReportFAB";
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

  useEffect(() => {
    setVillageSelection(null);
  }, [state.areaLayer]);

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
        villageSelection={villageSelection}
        onVillageClick={setVillageSelection}
        overlays={state.overlays}
        nasaLayers={state.nasaLayers}
        nasaDate={state.nasaDate}
      />
      {villageSelection && isAdminLodArea(state.areaLayer) ? (
        <AreaProfilPanel
          selection={villageSelection}
          variant={state.areaLayer === "r3pDistribution" ? "r3p" : "desa"}
          onClose={() => setVillageSelection(null)}
        />
      ) : null}
      <SiteNav />
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
      <MapSettings
        basemap={state.basemap}
        onBasemapChange={setBasemap}
        preferVector={state.preferVector}
        onPreferVectorChange={setPreferVector}
      />
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
