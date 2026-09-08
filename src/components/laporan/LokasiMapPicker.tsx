"use client";

import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import type { GeolocateControl as GeolocateControlImpl } from "maplibre-gl";
import MapGL, { GeolocateControl, Marker, NavigationControl } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "@/components/providers/ThemeProvider";
import { getBasemapStyle } from "@/lib/basemap";

type Props = {
  latitude: number;
  longitude: number;
  ariaLabel: string;
  recenterToken?: number;
  onPick: (latitude: number, longitude: number) => void;
};

export function LokasiMapPicker({
  latitude,
  longitude,
  ariaLabel,
  recenterToken,
  onPick,
}: Props) {
  const { theme } = useTheme();
  const mapRef = useRef<MapRef>(null);
  const geoRef = useRef<GeolocateControlImpl | null>(null);
  const dragging = useRef(false);
  const mapStyle = getBasemapStyle(theme === "light" ? "positron" : "dark");

  useEffect(() => {
    if (recenterToken == null || recenterToken < 1) return;
    mapRef.current?.flyTo({
      center: [longitude, latitude],
      zoom: 15,
      duration: 700,
    });
  }, [recenterToken, latitude, longitude]);

  return (
    <MapGL
      ref={mapRef}
      initialViewState={{ latitude, longitude, zoom: 12 }}
      mapStyle={mapStyle as never}
      attributionControl
      cooperativeGestures
      style={{ width: "100%", height: "100%" }}
      aria-label={ariaLabel}
      onClick={(event) => {
        if (dragging.current) return;
        onPick(event.lngLat.lat, event.lngLat.lng);
      }}
      onLoad={() => {
        geoRef.current?.trigger();
      }}
    >
      <NavigationControl position="top-right" showCompass={false} />
      <GeolocateControl
        ref={geoRef}
        position="top-right"
        positionOptions={{ enableHighAccuracy: true, timeout: 15000 }}
        onGeolocate={(event) => {
          onPick(event.coords.latitude, event.coords.longitude);
        }}
      />
      <Marker
        latitude={latitude}
        longitude={longitude}
        draggable
        anchor="bottom"
        onDragStart={() => {
          dragging.current = true;
        }}
        onDragEnd={(event) => {
          onPick(event.lngLat.lat, event.lngLat.lng);
          requestAnimationFrame(() => {
            dragging.current = false;
          });
        }}
      >
        <span className="flex flex-col items-center drop-shadow-md">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary">
            <MapPin size={16} className="text-primary-foreground" aria-hidden />
          </span>
          <span className="h-2 w-0.5 bg-primary" aria-hidden />
        </span>
      </Marker>
    </MapGL>
  );
}
