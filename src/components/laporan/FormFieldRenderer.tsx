"use client";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FormFieldDef } from "@/lib/laporan/definitions";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { cn } from "@/lib/utils";

type Props = {
  fields: FormFieldDef[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  laporanTipe?: "kejadian" | "penanganan";
};

const SKIP_KEYS = new Set([
  "rekam_koordinat",
  "nama_pelapor",
  "nik",
  "telepon",
  "email",
  "kontak_darurat",
]);

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function FormFieldRenderer({ fields, values, onChange, laporanTipe = "kejadian" }: Props) {
  const visible = fields.filter((f) => !SKIP_KEYS.has(f.field_key) && f.tipe_input !== "gps");

  return (
    <FieldGroup className="gap-4">
      {visible.map((field) => {
        const val = values[field.field_key];

        if (field.tipe_input === "select") {
          return (
            <Field key={field.field_key}>
              <FieldLabel htmlFor={`field-${field.field_key}`}>{field.label}</FieldLabel>
              <select
                id={`field-${field.field_key}`}
                required={field.wajib}
                value={String(val ?? "")}
                onChange={(e) => onChange(field.field_key, e.target.value)}
                className={selectClassName}
              >
                <option value="">—</option>
                {field.opsi?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
          );
        }

        if (field.tipe_input === "multiselect") {
          const selected = Array.isArray(val) ? val as string[] : [];
          const max = (field.validasi?.max_select as number | undefined) ?? 99;
          return (
            <Field key={field.field_key}>
              <FieldLabel>{field.label}</FieldLabel>
              <FieldGroup className="gap-2" data-slot="checkbox-group">
                {field.opsi?.map((o) => {
                  const checked = selected.includes(o.value);
                  return (
                    <Field key={o.value} orientation="horizontal" className="items-start">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (selected.length >= max) return;
                            onChange(field.field_key, [...selected, o.value]);
                          } else {
                            onChange(field.field_key, selected.filter((x) => x !== o.value));
                          }
                        }}
                        className="mt-1"
                      />
                      <FieldLabel className="font-normal">{o.label}</FieldLabel>
                    </Field>
                  );
                })}
              </FieldGroup>
            </Field>
          );
        }

        if (field.tipe_input === "number" || field.tipe_input === "rating") {
          return (
            <Field key={field.field_key}>
              <FieldLabel htmlFor={`field-${field.field_key}`}>{field.label}</FieldLabel>
              <Input
                id={`field-${field.field_key}`}
                type="number"
                required={field.wajib}
                min={field.validasi?.min as number | undefined}
                max={field.validasi?.max as number | undefined}
                value={val != null ? String(val) : ""}
                onChange={(e) => onChange(field.field_key, e.target.value ? Number(e.target.value) : undefined)}
              />
            </Field>
          );
        }

        if (field.tipe_input === "date" || field.tipe_input === "time") {
          return (
            <Field key={field.field_key}>
              <FieldLabel htmlFor={`field-${field.field_key}`}>{field.label}</FieldLabel>
              <Input
                id={`field-${field.field_key}`}
                type={field.tipe_input}
                required={field.wajib}
                value={String(val ?? "")}
                onChange={(e) => onChange(field.field_key, e.target.value)}
                className="[color-scheme:inherit]"
              />
            </Field>
          );
        }

        if (field.tipe_input === "textarea") {
          const maxLen = (field.validasi?.max_length as number | undefined) ?? 5000;
          const text = String(val ?? "");
          return (
            <Field key={field.field_key}>
              <FieldLabel htmlFor={`field-${field.field_key}`}>{field.label}</FieldLabel>
              <Textarea
                id={`field-${field.field_key}`}
                required={field.wajib}
                rows={4}
                maxLength={maxLen}
                value={text}
                onChange={(e) => onChange(field.field_key, e.target.value)}
              />
              {Boolean(field.validasi?.show_counter) ? (
                <FieldDescription>
                  {text.length}/{maxLen}
                </FieldDescription>
              ) : null}
            </Field>
          );
        }

        if (field.tipe_input === "file") {
          const paths = Array.isArray(val) ? (val as string[]) : [];
          const maxFiles = (field.validasi?.max_files as number | undefined) ?? 1;

          const uploadFiles = async (fileList: FileList | null) => {
            if (!fileList?.length) return;
            const uploaded: string[] = [...paths];
            for (const file of Array.from(fileList)) {
              if (uploaded.length >= maxFiles) break;
              const body = new FormData();
              body.set("file", file);
              body.set("laporan_tipe", laporanTipe);
              body.set("field_key", field.field_key);
              const res = await fetchPublicApi("/api/laporan/upload", { method: "POST", body });
              const json = await res.json();
              if (!res.ok) throw new Error(json.error ?? "Upload failed");
              uploaded.push(json.path as string);
            }
            onChange(field.field_key, uploaded);
          };

          return (
            <Field key={field.field_key}>
              <FieldLabel htmlFor={`field-${field.field_key}`}>{field.label}</FieldLabel>
              <Input
                id={`field-${field.field_key}`}
                type="file"
                accept={field.validasi?.accept as string | undefined}
                multiple={maxFiles > 1}
                onChange={async (e) => {
                  try {
                    await uploadFiles(e.target.files);
                  } catch (err) {
                    console.error(err);
                  }
                }}
              />
              {paths.length > 0 ? (
                <FieldDescription>{paths.length} file terunggah</FieldDescription>
              ) : null}
            </Field>
          );
        }

        const inputType =
          field.tipe_input === "phone" || field.tipe_input === "nik"
            ? "text"
            : field.tipe_input === "email"
              ? "email"
              : "text";

        return (
          <Field key={field.field_key}>
            <FieldLabel htmlFor={`field-${field.field_key}`}>{field.label}</FieldLabel>
            <Input
              id={`field-${field.field_key}`}
              type={inputType}
              required={field.wajib}
              maxLength={field.validasi?.max_length as number | undefined}
              value={String(val ?? "")}
              onChange={(e) => onChange(field.field_key, e.target.value)}
              className={cn(field.tipe_input === "nik" && "font-mono")}
            />
          </Field>
        );
      })}
    </FieldGroup>
  );
}
