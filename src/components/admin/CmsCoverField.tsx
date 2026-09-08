"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type CmsCoverFieldProps = {
  id: string;
  value: string;
  disabled: boolean;
  onUrl: (url: string) => void;
};

export function CmsCoverField({ id, value, disabled, onUrl }: CmsCoverFieldProps) {
  const t = useTranslations("admin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("file", file);
    const res = await fetch("/api/admin/cms/upload", { method: "POST", body });
    setBusy(false);
    if (!res.ok) {
      setError(t("cmsCoverError"));
      return;
    }
    const json = (await res.json()) as { publicUrl?: string };
    if (!json.publicUrl) {
      setError(t("cmsCoverError"));
      return;
    }
    onUrl(json.publicUrl);
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        id={id}
        disabled={disabled}
        value={value}
        onChange={(e) => onUrl(e.target.value)}
      />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || busy}
          onChange={(e) => void upload(e.target.files)}
        />
        {busy ? <Spinner /> : null}
        <span>{busy ? t("cmsCoverUploading") : t("cmsCoverPick")}</span>
      </label>
      <p className="text-xs text-muted-foreground">{t("cmsCoverHint")}</p>
      {value ? (
        <img src={value} alt="" className="max-h-32 rounded-md object-contain" />
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
