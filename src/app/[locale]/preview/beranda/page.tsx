import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

export const metadata: Metadata = {
  title: "Pratinjau beranda, Aceh Tangguh",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** The photographic beranda now lives on `/`. Keep this URL for old bookmarks. */
export default function PratinjauBerandaPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  redirect({ href: "/", locale: params.locale });
}
