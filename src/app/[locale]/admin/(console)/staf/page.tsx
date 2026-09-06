import { getTranslations } from "next-intl/server";
import { StaffInviteTable } from "@/components/admin/StaffInviteTable";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

export default async function AdminStafPage() {
  const t = await getTranslations("admin");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{t("staffTitle")}</h1>
        <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("staffLead")}</p>
      </div>
      <StaffInviteTable />
    </div>
  );
}
