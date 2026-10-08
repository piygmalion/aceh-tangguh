import { Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { StaticPreviewBanner } from "@/components/preview/StaticPreviewBanner";
import { FixtureDataBanner } from "@/components/preview/FixtureDataBanner";
import { GuideBot } from "@/components/panduan/GuideBot";
import { isStaticExport } from "@/lib/preview/env";
import { routing } from "@/i18n/routing";
import { messagesForPublicClient } from "@/lib/i18n/public-messages";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const SITE_ORIGIN = "https://aceh-tangguh.vercel.app";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const locale = params.locale === "en" ? "en" : "id";
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta" });
  const title = t("title");
  const description = t("description");
  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: { default: title, template: `%s · ${title}` },
    description,
    applicationName: title,
    manifest: "/manifest.webmanifest",
    openGraph: {
      title,
      description,
      siteName: title,
      locale: locale === "en" ? "en_US" : "id_ID",
      type: "website",
      url: `/${locale}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;
  if (!routing.locales.includes(locale as "id" | "en")) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  const meta = messages.meta as { title?: string; description?: string } | undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: meta?.title ?? "SIK Aceh",
    alternateName:
      locale === "en" ? "Aceh Disaster Information System" : "Sistem Informasi Kebencanaan Aceh",
    description: meta?.description ?? "Sistem Informasi Kebencanaan Aceh",
    url: `${SITE_ORIGIN}/${locale}`,
    inLanguage: locale,
  };

  return (
    <html
      lang={locale}
      data-theme="dark"
      className={`${plusJakarta.variable} dark`}
      suppressHydrationWarning
    >
      <body className={plusJakarta.className}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <NextIntlClientProvider messages={messagesForPublicClient(messages)}>
          <QueryProvider>
            <ThemeProvider>
              {isStaticExport() ? <StaticPreviewBanner /> : <FixtureDataBanner />}
              {children}
              <GuideBot />
            </ThemeProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
