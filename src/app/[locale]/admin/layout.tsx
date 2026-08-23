import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";

export const dynamic =
  process.env.NEXT_PUBLIC_STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";

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
