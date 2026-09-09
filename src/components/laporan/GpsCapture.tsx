"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { WilayahCascadeFields } from "@/components/laporan/WilayahCascadeFields";
import { applyLokasiCoords } from "@/lib/laporan/gps-lokasi";

const LokasiMapPicker = dynamic(
  () => import("@/components/laporan/LokasiMapPicker").then((mod) => mod.LokasiMapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-input bg-muted/20 text-sm text-muted-foreground sm:h-64">
        …
      </div>
    ),
  }
);

export type LokasiValue = {
  latitude: number;
  longitude: number;
  kabupaten_kota: string;
  kecamatan: string;
  desa: string;
};

type Props = {
  value: LokasiValue;
  onChange: (v: LokasiValue) => void;
};

export function GpsCapture({ value, onChange }: Props) {
  const t = useTranslations("laporForm");
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [recenterToken, setRecenterToken] = useState(0);

  function applyPoint(lat: number, lon: number, announceError: boolean) {
    const result = applyLokasiCoords(lat, lon);
    if (!result.ok) {
      if (announceError) {
        setGpsError(result.reason === "outside_aceh" ? t("gpsOutsideAceh") : t("gpsFailed"));
      }
      return false;
    }
    setGpsError(null);
    onChange({ ...value, latitude: result.latitude, longitude: result.longitude });
    return true;
  }

  function captureGps() {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError(t("gpsUnsupported"));
      return;
    }
    setCapturing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ok = applyPoint(pos.coords.latitude, pos.coords.longitude, true);
        if (ok) setRecenterToken((n) => n + 1);
        setCapturing(false);
      },
      () => {
        setGpsError(t("gpsFailed"));
        setCapturing(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-input bg-background/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin size={16} className="text-primary" />
          {t("gpsTitle")}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={captureGps}
          disabled={capturing}
          data-icon="inline-start"
        >
          {capturing ? <Spinner /> : <Navigation />}
          {capturing ? t("gpsCapturing") : t("gpsCapture")}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t("gpsMapHint")}</p>
      <div
        className="h-56 overflow-hidden rounded-lg border border-input sm:h-64"
        data-testid="lokasi-map"
      >
        <LokasiMapPicker
          latitude={value.latitude}
          longitude={value.longitude}
          ariaLabel={t("gpsMapAria")}
          recenterToken={recenterToken}
          onPick={(lat, lon) => {
            applyPoint(lat, lon, true);
          }}
        />
      </div>
      {gpsError ? <FieldError>{gpsError}</FieldError> : null}
      <FieldGroup className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="gps-latitude">Latitude</FieldLabel>
          <Input
            id="gps-latitude"
            type="number"
            step="any"
            required
            value={value.latitude}
            onChange={(e) => onChange({ ...value, latitude: Number(e.target.value) })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="gps-longitude">Longitude</FieldLabel>
          <Input
            id="gps-longitude"
            type="number"
            step="any"
            required
            value={value.longitude}
            onChange={(e) => onChange({ ...value, longitude: Number(e.target.value) })}
          />
        </Field>
        <WilayahCascadeFields
          value={value}
          onChange={(wilayah) => onChange({ ...value, ...wilayah })}
        />
      </FieldGroup>
    </div>
  );
}
