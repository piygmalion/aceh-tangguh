import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";

export const dynamic = "force-dynamic";

export default function AdminRootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  return (
    <>
      <SiteNav />
      {children}
    </>
  );
}
