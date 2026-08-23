"use client";

import { Suspense, useEffect, useState } from "react";
import { useMapUrlState } from "@/hooks/useMapUrlState";
import { MapTopBar } from "@/components/map/MapTopBar";
import { MapToolbar } from "@/components/map/MapToolbar";
import { MapSettings } from "@/components/map/MapSettings";
import { MapViewport } from "@/components/map/MapViewport";
import { AreaProfilPanel } from "@/components/map/AreaProfilPanel";
import { ReportFAB } from "@/components/map/ReportFAB";
import type { VillageClickSelection } from "@/lib/profil-desa";

function MapWorkspaceInner() {
  const { state, setView, setBasemap, setAreaLayer, toggleMarkerLayer, toggleDisasterJenis } = useMapUrlState();
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
      <MapTopBar />
      <MapToolbar
        areaLayer={state.areaLayer}
        onAreaLayerChange={setAreaLayer}
        markerLayers={state.markerLayers}
        onToggleMarker={toggleMarkerLayer}
        disasterJenis={state.disasterJenis}
        onToggleDisasterJenis={toggleDisasterJenis}
      />
      <MapSettings basemap={state.basemap} onBasemapChange={setBasemap} />
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
