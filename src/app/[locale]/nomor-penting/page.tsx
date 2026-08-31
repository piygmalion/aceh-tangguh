import { setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { NomorPentingList } from "@/components/sik/NomorPentingList";
import { Link } from "@/i18n/routing";

export default function NomorPentingPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-28">
        <p className="text-sm text-[var(--text-dim)]">
          <Link href="/" className="hover:text-[var(--primary)]">Beranda</Link>
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Nomor penting layanan kebencanaan</h1>
        <p className="mt-3 max-w-3xl text-[var(--text-dim)]">
          Kontak BPBA, BPBD kab/kota, fasilitas kesehatan, dan layanan terkait. Dikelola staf lewat konsol SIK.
        </p>
        <div className="mt-8">
          <NomorPentingList />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
