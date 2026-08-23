"use client";

import { Suspense } from "react";
import { useMapUrlState } from "@/hooks/useMapUrlState";
import { MapTopBar } from "@/components/map/MapTopBar";
import { MapToolbar } from "@/components/map/MapToolbar";
import { MapSettings } from "@/components/map/MapSettings";
import { MapViewport } from "@/components/map/MapViewport";
import { ReportFAB } from "@/components/map/ReportFAB";

function MapWorkspaceInner() {
  const { state, setView, setBasemap, setAreaLayer, toggleMarkerLayer } = useMapUrlState();

  return (
    <div className="relative h-[100svh] w-full overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <MapViewport
        view={state.view}
        onViewChange={setView}
        basemap={state.basemap}
        markerLayers={state.markerLayers}
        areaLayer={state.areaLayer}
      />
      <MapTopBar />
      <MapToolbar
        areaLayer={state.areaLayer}
        onAreaLayerChange={setAreaLayer}
        markerLayers={state.markerLayers}
        onToggleMarker={toggleMarkerLayer}
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
