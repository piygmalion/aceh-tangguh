import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { GlassPanel } from "@/components/ui/GlassPanel";

export default async function AdminCmsIndexPage() {
  const t = await getTranslations("admin");
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Link href="/admin/cms/publikasi">
        <GlassPanel className="h-full p-5 transition hover:border-[var(--accent)]">
          <h1 className="text-lg font-semibold">{t("cmsPublikasiTitle")}</h1>
          <p className="mt-1 text-sm text-[var(--text-dim)]">{t("cmsPublikasiLead")}</p>
        </GlassPanel>
      </Link>
      <Link href="/admin/cms/kejadian">
        <GlassPanel className="h-full p-5 transition hover:border-[var(--accent)]">
          <h1 className="text-lg font-semibold">{t("cmsKejadianTitle")}</h1>
          <p className="mt-1 text-sm text-[var(--text-dim)]">{t("cmsKejadianLead")}</p>
        </GlassPanel>
      </Link>
    </div>
  );
}
