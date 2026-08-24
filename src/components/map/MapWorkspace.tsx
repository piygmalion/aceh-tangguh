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

function MapWorkspaceInner() {
  const {
    state,
    setView,
    setBasemap,
    setPreferVector,
    setAreaLayer,
    toggleMarkerLayer,
    toggleDisasterJenis,
    toggleFasilitasUmum,
  } = useMapUrlState();
  const [villageSelection, setVillageSelection] =
    useState<VillageClickSelection | null>(null);

  useEffect(() => {
    if (state.areaLayer !== "villageDistribution") {
      setVillageSelection(null);
    }
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
        disasterJenis={state.disasterJenis}
        villageSelection={villageSelection}
        onVillageClick={setVillageSelection}
      />
      {villageSelection && state.areaLayer === "villageDistribution" ? (
        <AreaProfilPanel
          selection={villageSelection}
          onClose={() => setVillageSelection(null)}
        />
      ) : null}
      <SiteNav />
      <MapToolbar
        areaLayer={state.areaLayer}
        onAreaLayerChange={setAreaLayer}
        markerLayers={state.markerLayers}
        onToggleMarker={toggleMarkerLayer}
        disasterJenis={state.disasterJenis}
        onToggleDisasterJenis={toggleDisasterJenis}
        onToggleFasilitasUmum={toggleFasilitasUmum}
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
