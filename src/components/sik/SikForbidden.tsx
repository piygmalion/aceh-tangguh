import { getTranslations } from "next-intl/server";
import { GlassPanel } from "@/components/ui/GlassPanel";

export async function SikForbidden() {
  const t = await getTranslations("admin");
  return (
    <GlassPanel className="p-6">
      <p className="text-sm text-[var(--text-dim)]">{t("sikForbidden")}</p>
    </GlassPanel>
  );
}
