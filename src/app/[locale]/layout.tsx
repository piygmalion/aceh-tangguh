import { Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
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
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
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

  return (
    <html
      lang={locale}
      data-theme="dark"
      className={`${plusJakarta.variable} dark`}
      suppressHydrationWarning
    >
      <body className={plusJakarta.className}>
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
