import { setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PelatihanPublic } from "@/components/sik/PelatihanPublic";
import { Link } from "@/i18n/routing";

export default function PelatihanPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-28">
        <p className="text-sm text-[var(--text-dim)]">
          <Link href="/" className="hover:text-[var(--primary)]">Beranda</Link>
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Edukasi dan pelatihan</h1>
        <p className="mt-3 max-w-3xl text-[var(--text-dim)]">
          Jadwal pelatihan BPBA/BPBD dan formulir usulan pelatihan dari desa atau komunitas.
        </p>
        <div className="mt-8">
          <PelatihanPublic />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
