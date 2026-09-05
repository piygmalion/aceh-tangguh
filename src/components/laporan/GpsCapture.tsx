"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { inAcehBounds } from "@/lib/laporan/definitions";

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

  function captureGps() {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError(t("gpsUnsupported"));
      return;
    }
    setCapturing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        if (!inAcehBounds(lat, lon)) {
          setGpsError(t("gpsOutsideAceh"));
          setCapturing(false);
          return;
        }
        onChange({ ...value, latitude: lat, longitude: lon });
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
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="gps-kabupaten">{t("kabupaten")}</FieldLabel>
          <Input
            id="gps-kabupaten"
            required
            value={value.kabupaten_kota}
            onChange={(e) => onChange({ ...value, kabupaten_kota: e.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="gps-kecamatan">{t("kecamatan")}</FieldLabel>
          <Input
            id="gps-kecamatan"
            value={value.kecamatan}
            onChange={(e) => onChange({ ...value, kecamatan: e.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="gps-desa">{t("desa")}</FieldLabel>
          <Input
            id="gps-desa"
            value={value.desa}
            onChange={(e) => onChange({ ...value, desa: e.target.value })}
          />
        </Field>
      </FieldGroup>
    </div>
  );
}
