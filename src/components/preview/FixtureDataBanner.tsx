import { getTranslations } from "next-intl/server";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { isServingFixtureFallback } from "@/lib/data-health";
import { isStaticExport } from "@/lib/preview/env";

/** Banner when live Node deploy falls back to public/fixtures (not GitHub Pages). */
export async function FixtureDataBanner() {
  if (isStaticExport()) return null;
  if (!(await isServingFixtureFallback())) return null;

  const t = await getTranslations("staticPreview");
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-3 z-[60] flex justify-center px-3"
      role="status"
    >
      <p
        className={cn(
          "pointer-events-auto max-w-3xl rounded-full border border-[var(--glass-border)] bg-[var(--bg-raised)]/95 px-3.5 py-1.5 text-center text-[var(--text-dim)] shadow-[var(--shadow)] backdrop-blur-md",
          TYPE_FLOOR_CLASS
        )}
      >
        {t("fixtureBanner")}
      </p>
    </div>
  );
}
