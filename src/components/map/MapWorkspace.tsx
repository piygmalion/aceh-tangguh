"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [featurePopupOpen, setFeaturePopupOpen] = useState(false);
  const [layerPanelOpen, setLayerPanelOpen] = useState(false);
  const onLayerPanelChange = useCallback((open: boolean) => {
    setLayerPanelOpen(open);
  }, []);
  const onFeaturePopupChange = useCallback((open: boolean) => {
    setFeaturePopupOpen(open);
  }, []);

  useEffect(() => {
    setVillageSelection(null);
    setLodSelection(null);
  }, [state.areaLayer]);

  const onVillageClick = (sel: VillageClickSelection) => {
    setVillageSelection(sel);
    setLodSelection(sel);
  };

  return (
    <div
      data-feature-popup={featurePopupOpen ? "open" : undefined}
      className="relative h-[100svh] w-full overflow-hidden bg-[var(--bg)] text-[var(--text)]"
    >
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
        onFeaturePopupChange={onFeaturePopupChange}
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
      <StatusLegend
        collapsible
        className={cn(
          "absolute left-14 top-[5.75rem] z-20 w-[min(16rem,calc(100vw-6.5rem))] md:hidden",
          settingsOpen && "hidden",
          featurePopupOpen && "hidden",
          layerPanelOpen && "hidden",
        )}
      />
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
        onExpandedChange={onLayerPanelChange}
      />
      <div
        data-map-chrome="settings"
        className={cn(
          "pointer-events-none absolute bottom-[5.75rem] left-3 z-30 flex flex-col items-start gap-3 sm:bottom-6 md:bottom-4 md:left-4",
          featurePopupOpen && "max-md:hidden",
          layerPanelOpen && "max-md:hidden",
        )}
      >
        <StatusLegend
          className={cn(
            "pointer-events-auto",
            settingsOpen ? "hidden" : "hidden md:block",
          )}
        />
        <MapSettings
          basemap={state.basemap}
          onBasemapChange={setBasemap}
          preferVector={state.preferVector}
          onPreferVectorChange={setPreferVector}
          onOpenChange={setSettingsOpen}
          className="pointer-events-auto static bottom-auto left-auto sm:bottom-auto"
        />
      </div>
      <div
        data-map-chrome="fab"
        className={cn(
          featurePopupOpen && "max-md:hidden",
          layerPanelOpen && "max-md:hidden",
        )}
      >
        <ReportFAB />
      </div>
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
