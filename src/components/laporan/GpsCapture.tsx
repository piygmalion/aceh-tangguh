"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button-legacy";
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
    <div className="space-y-3 rounded-xl border border-[var(--glass-border)] bg-[var(--bg)]/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPin size={16} className="text-[var(--accent)]" />
          {t("gpsTitle")}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={captureGps} disabled={capturing} leftIcon={<Navigation size={14} />}>
          {capturing ? t("gpsCapturing") : t("gpsCapture")}
        </Button>
      </div>
      {gpsError && <p className="text-sm text-[var(--danger)]">{gpsError}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--text-dim)]">Latitude</span>
          <input
            type="number"
            step="any"
            required
            value={value.latitude}
            onChange={(e) => onChange({ ...value, latitude: Number(e.target.value) })}
            className="field-input"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--text-dim)]">Longitude</span>
          <input
            type="number"
            step="any"
            required
            value={value.longitude}
            onChange={(e) => onChange({ ...value, longitude: Number(e.target.value) })}
            className="field-input"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-[var(--text-dim)]">{t("kabupaten")}</span>
          <input
            required
            value={value.kabupaten_kota}
            onChange={(e) => onChange({ ...value, kabupaten_kota: e.target.value })}
            className="field-input"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--text-dim)]">{t("kecamatan")}</span>
          <input
            value={value.kecamatan}
            onChange={(e) => onChange({ ...value, kecamatan: e.target.value })}
            className="field-input"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-[var(--text-dim)]">{t("desa")}</span>
          <input
            value={value.desa}
            onChange={(e) => onChange({ ...value, desa: e.target.value })}
            className="field-input"
          />
        </label>
      </div>
    </div>
  );
}
