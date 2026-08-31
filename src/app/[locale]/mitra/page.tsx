import { setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { MitraPublic } from "@/components/sik/MitraPublic";
import { Link } from "@/i18n/routing";

export default function MitraPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-28">
        <p className="text-sm text-[var(--text-dim)]">
          <Link href="/" className="hover:text-[var(--primary)]">Beranda</Link>
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Mitra kebencanaan</h1>
        <p className="mt-3 max-w-3xl text-[var(--text-dim)]">
          Unit Layanan Disabilitas dan Forum Pengurangan Risiko Bencana. Data individu disabilitas tidak dipublikasikan.
        </p>
        <div className="mt-8">
          <MitraPublic />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
