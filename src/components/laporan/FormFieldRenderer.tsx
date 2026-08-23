"use client";

import type { FormFieldDef } from "@/lib/laporan/definitions";
import { fetchPublicApi } from "@/lib/preview/public-api";

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

export function FormFieldRenderer({ fields, values, onChange, laporanTipe = "kejadian" }: Props) {
  const visible = fields.filter((f) => !SKIP_KEYS.has(f.field_key) && f.tipe_input !== "gps");

  return (
    <div className="space-y-4">
      {visible.map((field) => {
        const val = values[field.field_key];

        if (field.tipe_input === "select") {
          return (
            <label key={field.field_key} className="block text-sm">
              <span className="mb-1 block">{field.label}</span>
              <select
                required={field.wajib}
                value={String(val ?? "")}
                onChange={(e) => onChange(field.field_key, e.target.value)}
                className="w-full rounded-lg border border-[var(--glass-border)] bg-transparent px-3 py-2"
              >
                <option value="">—</option>
                {field.opsi?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          );
        }

        if (field.tipe_input === "multiselect") {
          const selected = Array.isArray(val) ? val as string[] : [];
          const max = (field.validasi?.max_select as number | undefined) ?? 99;
          return (
            <div key={field.field_key} className="block text-sm">
              <span className="mb-2 block">{field.label}</span>
              <div className="space-y-2">
                {field.opsi?.map((o) => {
                  const checked = selected.includes(o.value);
                  return (
                    <label key={o.value} className="flex items-start gap-2">
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
                      <span>{o.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        }

        if (field.tipe_input === "number" || field.tipe_input === "rating") {
          return (
            <label key={field.field_key} className="block text-sm">
              <span className="mb-1 block">{field.label}</span>
              <input
                type="number"
                required={field.wajib}
                min={field.validasi?.min as number | undefined}
                max={field.validasi?.max as number | undefined}
                value={val != null ? String(val) : ""}
                onChange={(e) => onChange(field.field_key, e.target.value ? Number(e.target.value) : undefined)}
                className="w-full rounded-lg border border-[var(--glass-border)] bg-transparent px-3 py-2"
              />
            </label>
          );
        }

        if (field.tipe_input === "date" || field.tipe_input === "time") {
          return (
            <label key={field.field_key} className="block text-sm">
              <span className="mb-1 block">{field.label}</span>
              <input
                type={field.tipe_input}
                required={field.wajib}
                value={String(val ?? "")}
                onChange={(e) => onChange(field.field_key, e.target.value)}
                className="w-full rounded-lg border border-[var(--glass-border)] bg-transparent px-3 py-2"
              />
            </label>
          );
        }

        if (field.tipe_input === "textarea") {
          const maxLen = (field.validasi?.max_length as number | undefined) ?? 5000;
          const text = String(val ?? "");
          return (
            <label key={field.field_key} className="block text-sm">
              <span className="mb-1 block">{field.label}</span>
              <textarea
                required={field.wajib}
                rows={4}
                maxLength={maxLen}
                value={text}
                onChange={(e) => onChange(field.field_key, e.target.value)}
                className="w-full rounded-lg border border-[var(--glass-border)] bg-transparent px-3 py-2"
              />
              {Boolean(field.validasi?.show_counter) && (
                <span className="mt-1 block text-xs text-[var(--text-dim)]">{text.length}/{maxLen}</span>
              )}
            </label>
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
            <label key={field.field_key} className="block text-sm">
              <span className="mb-1 block">{field.label}</span>
              <input
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
                className="w-full text-sm"
              />
              {paths.length > 0 && (
                <span className="mt-1 block text-xs text-[var(--text-dim)]">
                  {paths.length} file terunggah
                </span>
              )}
            </label>
          );
        }

        const inputType =
          field.tipe_input === "phone" || field.tipe_input === "nik"
            ? "text"
            : field.tipe_input === "email"
              ? "email"
              : "text";

        return (
          <label key={field.field_key} className="block text-sm">
            <span className="mb-1 block">{field.label}</span>
            <input
              type={inputType}
              required={field.wajib}
              maxLength={field.validasi?.max_length as number | undefined}
              value={String(val ?? "")}
              onChange={(e) => onChange(field.field_key, e.target.value)}
              className="w-full rounded-lg border border-[var(--glass-border)] bg-transparent px-3 py-2"
            />
          </label>
        );
      })}
    </div>
  );
}
