"use client";

import { useTranslations } from "next-intl";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
    <FieldGroup className="gap-3">
      <Field>
        <FieldTitle>{t("identityTitle")}</FieldTitle>
        <FieldDescription>{t("identityNote")}</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="reporter-nama">{t("nama")}</FieldLabel>
        <Input
          id="reporter-nama"
          required
          value={value.nama}
          onChange={(e) => onChange({ ...value, nama: e.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="reporter-nik">{t("nik")}</FieldLabel>
        <Input
          id="reporter-nik"
          required
          pattern="\d{16}"
          maxLength={16}
          value={value.nik}
          onChange={(e) => onChange({ ...value, nik: e.target.value.replace(/\D/g, "") })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="reporter-telepon">{t("telepon")}</FieldLabel>
        <Input
          id="reporter-telepon"
          value={value.telepon}
          onChange={(e) => onChange({ ...value, telepon: e.target.value })}
          placeholder="628..."
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="reporter-email">{t("email")}</FieldLabel>
        <Input
          id="reporter-email"
          type="email"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="reporter-kontak">{t("kontakDarurat")}</FieldLabel>
        <Input
          id="reporter-kontak"
          value={value.kontak_darurat}
          onChange={(e) => onChange({ ...value, kontak_darurat: e.target.value })}
        />
      </Field>
    </FieldGroup>
  );
}
