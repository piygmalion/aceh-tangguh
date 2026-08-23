"use client";

import { useTranslations } from "next-intl";

export type ReporterValue = {
  nama: string;
  nik: string;
  telepon: string;
  email: string;
  kontak_darurat: string;
};

type Props = {
  value: ReporterValue;
  onChange: (v: ReporterValue) => void;
};

export function ReporterFields({ value, onChange }: Props) {
  const t = useTranslations("laporForm");

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{t("identityTitle")}</h3>
      <p className="text-xs text-[var(--text-dim)]">{t("identityNote")}</p>
      <label className="block text-sm">
        <span className="mb-1 block">{t("nama")}</span>
        <input
          required
          value={value.nama}
          onChange={(e) => onChange({ ...value, nama: e.target.value })}
          className="w-full rounded-lg border border-[var(--glass-border)] bg-transparent px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block">{t("nik")}</span>
        <input
          required
          pattern="\d{16}"
          maxLength={16}
          value={value.nik}
          onChange={(e) => onChange({ ...value, nik: e.target.value.replace(/\D/g, "") })}
          className="w-full rounded-lg border border-[var(--glass-border)] bg-transparent px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block">{t("telepon")}</span>
        <input
          value={value.telepon}
          onChange={(e) => onChange({ ...value, telepon: e.target.value })}
          className="w-full rounded-lg border border-[var(--glass-border)] bg-transparent px-3 py-2"
          placeholder="628..."
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block">{t("email")}</span>
        <input
          type="email"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          className="w-full rounded-lg border border-[var(--glass-border)] bg-transparent px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block">{t("kontakDarurat")}</span>
        <input
          value={value.kontak_darurat}
          onChange={(e) => onChange({ ...value, kontak_darurat: e.target.value })}
          className="w-full rounded-lg border border-[var(--glass-border)] bg-transparent px-3 py-2"
        />
      </label>
    </div>
  );
}
