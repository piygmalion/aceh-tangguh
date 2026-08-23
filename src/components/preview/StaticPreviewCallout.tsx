import { getTranslations } from "next-intl/server";
import { isStaticExport } from "@/lib/preview/env";

export async function StaticPreviewCallout() {
  if (!isStaticExport()) return null;
  const t = await getTranslations("staticPreview");
  return (
    <p className="mb-4 rounded-xl border border-[var(--glass-border)] bg-[var(--bg-muted)] px-3 py-2 text-sm text-[var(--text-dim)]">
      {t("lead")}
    </p>
  );
}
