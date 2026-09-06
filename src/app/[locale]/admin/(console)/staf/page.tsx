import { getTranslations } from "next-intl/server";
import { StaffInviteTable } from "@/components/admin/StaffInviteTable";

export default async function AdminStafPage() {
  const t = await getTranslations("admin");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">{t("staffTitle")}</h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">{t("staffLead")}</p>
      </div>
      <StaffInviteTable />
    </div>
  );
}
