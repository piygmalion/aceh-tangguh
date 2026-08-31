import { requireStaffPage } from "@/lib/auth/admin";
import { canAccessModule } from "@/lib/sik/roles";
import { createServerClient } from "@/lib/supabase/server";
import { SikForbidden } from "@/components/sik/SikForbidden";
import type { KejadianDampakRow, KejadianOperasiRow } from "@/lib/sik/db-tables";

export default async function CetakKejadianPage({ params }: { params: { id: string } }) {
  const { profile } = await requireStaffPage();
  if (!canAccessModule(profile, "kejadian")) return <SikForbidden />;
  const client = createServerClient();
  if (!client) return <p>Supabase tidak tersedia.</p>;
  const { data: item } = await client.from("kejadian_operasi").select("*").eq("id", params.id).maybeSingle();
  if (!item) return <p>Kejadian tidak ditemukan.</p>;
  const row = item as KejadianOperasiRow;
  const { data: instansi } = await client
    .from("instansi")
    .select("nama, kop_surat_url, penandatangan_nama, penandatangan_pangkat, penandatangan_nip")
    .limit(1)
    .maybeSingle();
  const { data: dampak } = await client
    .from("kejadian_dampak")
    .select("*")
    .eq("kejadian_id", params.id)
    .order("tanggal", { ascending: false })
    .limit(1);
  const latest = (dampak?.[0] ?? null) as KejadianDampakRow | null;
  const kopUrl = typeof instansi?.kop_surat_url === "string" ? instansi.kop_surat_url : null;
  const instansiNama = typeof instansi?.nama === "string" ? instansi.nama : null;
  const ttdNama =
    typeof instansi?.penandatangan_nama === "string" ? instansi.penandatangan_nama : null;
  const ttdPangkat =
    typeof instansi?.penandatangan_pangkat === "string" ? instansi.penandatangan_pangkat : null;
  const ttdNip =
    typeof instansi?.penandatangan_nip === "string" ? instansi.penandatangan_nip : null;

  return (
    <article className="mx-auto max-w-3xl bg-white p-8 text-black print:max-w-none">
      <style>{`@media print { nav, .no-print { display: none !important; } }`}</style>
      {kopUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={kopUrl} alt="Kop surat" className="mb-6 max-h-24" />
      ) : (
        <header className="mb-6 border-b pb-3 text-center">
          <p className="text-sm uppercase">Pemerintah Aceh · BPBA</p>
          <p className="text-lg font-semibold">{instansiNama ?? "Laporan Kejadian Bencana"}</p>
        </header>
      )}
      <h1 className="text-xl font-semibold">{row.nama_kejadian}</h1>
      <p className="mt-1 text-sm">
        {row.nomor} · {row.jenis_bencana} · {new Date(row.waktu_kejadian).toLocaleString("id-ID")}
      </p>
      <section className="mt-4 space-y-2 text-sm">
        <p>
          <strong>Lokasi:</strong> {[row.desa_ringkas, row.kecamatan, row.kabupaten].filter(Boolean).join(", ")}
        </p>
        <p>
          <strong>Penyebab:</strong> {row.penyebab || "—"}
        </p>
        <p>
          <strong>Kronologi:</strong> {row.kronologi || row.deskripsi || "—"}
        </p>
        <p>
          <strong>Himbauan:</strong> {row.himbauan || "—"}
        </p>
      </section>
      {latest ? (
        <section className="mt-6 text-sm">
          <h2 className="font-semibold">Kaji cepat ({latest.tanggal})</h2>
          <ul className="mt-2 grid grid-cols-2 gap-1">
            <li>Meninggal: {latest.meninggal}</li>
            <li>Hilang: {latest.hilang}</li>
            <li>Luka berat: {latest.luka_berat}</li>
            <li>Mengungsi: {latest.mengungsi}</li>
            <li>Rumah RB/RS/RR: {latest.rumah_rb}/{latest.rumah_rs}/{latest.rumah_rr}</li>
          </ul>
        </section>
      ) : null}
      <footer className="mt-12 text-sm">
        <p>Penandatangan: {ttdNama ?? "Kepala Pelaksana BPBA"}</p>
        <p>{ttdPangkat}</p>
        <p>NIP {ttdNip ?? "—"}</p>
      </footer>
      <p className="no-print mt-8 text-sm text-[var(--text-dim)]">Gunakan cetak browser (Ctrl+P) untuk PDF.</p>
    </article>
  );
}
