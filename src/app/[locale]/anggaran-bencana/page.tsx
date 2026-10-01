import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";

/** Old public URL. Figures live at `/admin/anggaran` behind the console guard. */
export default function AnggaranBencanaPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  redirect({ href: "/admin/anggaran", locale: params.locale });
}
