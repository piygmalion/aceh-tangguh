import { setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { DestanaPublicList } from "@/components/sik/DestanaPublicList";
import { Link } from "@/i18n/routing";

export default function DestanaPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-28">
        <p className="text-sm text-[var(--text-dim)]">
          <Link href="/" className="hover:text-[var(--primary)]">Beranda</Link>
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Desa Tangguh Bencana</h1>
        <p className="mt-3 max-w-3xl text-[var(--text-dim)]">
          Status Destana berdasarkan Penilaian Ketangguhan Desa (Perka BNPB No. 1/2012): Pratama, Madya, Utama.
        </p>
        <div className="mt-8">
          <DestanaPublicList />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
