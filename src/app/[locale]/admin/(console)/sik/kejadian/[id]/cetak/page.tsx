import { requireStaffPage } from "@/lib/auth/admin";
import { canAccessModule } from "@/lib/sik/roles";
import { createServerClient } from "@/lib/supabase/server";
import { SikForbidden } from "@/components/sik/SikForbidden";
import type { KejadianDampakRow, KejadianOperasiRow } from "@/lib/sik/db-tables";

export default async function CetakKejadianPage({ params }: { params: { id: string } }) {
  const { profile, roleModules } = await requireStaffPage();
  if (!canAccessModule(profile, "kejadian", roleModules)) return <SikForbidden />;
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
          <p className="text-lg font-semibold">{instansiNama ?? "Data Kejadian dan Dampak Bencana"}</p>
          <p className="text-xs">Juklak BNPB No. 7 Tahun 2023 · Lampiran I</p>
        </header>
      )}
      <h1 className="text-xl font-semibold">{row.nama_kejadian}</h1>
      <p className="mt-1 text-sm">
        KIB {row.kib ?? "—"} · {row.nomor} · {row.jenis_bencana} · {row.tarikh ?? new Date(row.waktu_kejadian).toLocaleString("id-ID")}
      </p>
      <p className="text-sm">Fase data: {row.fase_data} · {row.is_bencana ? "Memenuhi ambang batas bencana" : "Di bawah ambang batas"}</p>

      <section className="mt-4 space-y-1 text-sm">
        <h2 className="font-semibold">1. Data kejadian bencana</h2>
        <p><strong>Lokasi:</strong> {[row.desa_ringkas, row.kecamatan, row.kabupaten].filter(Boolean).join(", ")}</p>
        <p><strong>Koordinat:</strong> {row.latitude ?? "—"}, {row.longitude ?? "—"}</p>
        <p><strong>Penyebab:</strong> {row.penyebab || "—"}</p>
        <p><strong>Kronologi:</strong> {row.kronologi || "—"}</p>
        <p><strong>Deskripsi:</strong> {row.deskripsi || "—"}</p>
        <p><strong>Sumber:</strong> {row.sumber_informasi || "—"}</p>
        <p><strong>Kondisi mutakhir:</strong> {row.kondisi_mutakhir || latest?.kondisi_mutakhir || "—"}</p>
        <p><strong>Status darurat:</strong> {row.status_darurat ? `Ya ${row.nomor_sk ?? ""}` : "Tidak"}</p>
        <p><strong>Permintaan bantuan nasional:</strong> {row.permintaan_bantuan_nasional ? "Ya" : "Tidak"}</p>
        <p><strong>Upaya penanganan:</strong> {row.upaya_penanganan || latest?.upaya_penanganan || "—"}</p>
        <p><strong>Sebaran dampak:</strong> {row.sebaran_dampak || "—"}</p>
      </section>

      {latest ? (
        <>
          <section className="mt-4 space-y-1 text-sm">
            <h2 className="font-semibold">2. Data kebutuhan ({latest.tanggal})</h2>
            <p>Dana: {latest.kebutuhan_dana_juta ?? "—"} juta</p>
            <p>SDM: {latest.kebutuhan_sdm || "—"}</p>
            <p>Sapras: {latest.kebutuhan_sapras || "—"}</p>
            <p>Logistik: {latest.kebutuhan_logistik || "—"}</p>
            <p>Peralatan: {latest.kebutuhan_peralatan || "—"}</p>
          </section>
          <section className="mt-4 text-sm">
            <h2 className="font-semibold">3. Akibat terhadap manusia</h2>
            <ul className="mt-1 grid grid-cols-2 gap-1">
              <li>Meninggal: {latest.meninggal}</li>
              <li>Hilang: {latest.hilang}</li>
              <li>Luka berat / ringan: {latest.luka_berat} / {latest.luka_ringan}</li>
              <li>Menderita: {latest.menderita}</li>
              <li>Mengungsi: {latest.mengungsi}</li>
            </ul>
          </section>
          <section className="mt-4 text-sm">
            <h2 className="font-semibold">4. Kerusakan sosial ekonomi</h2>
            <p>Sawah {latest.sawah_ha ?? "—"} Ha · Lahan {latest.lahan_ha ?? "—"} Ha · Kebun {latest.kebun_ha ?? "—"} Ha · Hutan {latest.hutan_ha ?? "—"} Ha · Kolam {latest.kolam_ha ?? "—"} Ha</p>
            <p>Toko RB/RS/RR/terendam: {latest.toko_rb}/{latest.toko_rs}/{latest.toko_rr}/{latest.toko_terendam}</p>
            <p>Pabrik RB/RS/RR/terendam: {latest.pabrik_rb}/{latest.pabrik_rs}/{latest.pabrik_rr}/{latest.pabrik_terendam}</p>
          </section>
          <section className="mt-4 text-sm">
            <h2 className="font-semibold">5. Prasarana dan sarana vital</h2>
            <p>Air: {latest.air_jaringan || "—"} · Listrik: {latest.listrik_jaringan || "—"} · Telekom: {latest.telekom_jaringan || "—"}</p>
            <p>Irigasi: {latest.irigasi_jaringan || "—"} · Jalan: {latest.jalan_km ?? "—"} km</p>
            <p>Jembatan RB/RS/RR: {latest.jembatan_rb}/{latest.jembatan_rs}/{latest.jembatan_rr}</p>
            <p>Transportasi: {latest.transportasi_jaringan || "—"} · SPBU: {latest.spbu_jaringan || "—"}</p>
          </section>
          <section className="mt-4 text-sm">
            <h2 className="font-semibold">6. Rumah</h2>
            <p>RB/RS/RR/terendam: {latest.rumah_rb}/{latest.rumah_rs}/{latest.rumah_rr}/{latest.rumah_terendam} · Kerugian {latest.kerugian_rumah_rp ?? "—"} juta</p>
          </section>
          <section className="mt-4 text-sm">
            <h2 className="font-semibold">7. Pelayanan dasar</h2>
            <p>Pendidikan RB/RS/RR: {latest.pendidikan_rb}/{latest.pendidikan_rs}/{latest.pendidikan_rr}</p>
            <p>Ibadat: {latest.ibadah_rb}/{latest.ibadah_rs}/{latest.ibadah_rr} · Faskes: {latest.faskes_rb}/{latest.faskes_rs}/{latest.faskes_rr}</p>
            <p>Kantor: {latest.kantor_rb}/{latest.kantor_rs}/{latest.kantor_rr} · Pasar: {latest.pasar_rb}/{latest.pasar_rs}/{latest.pasar_rr}</p>
          </section>
          <section className="mt-4 text-sm">
            <h2 className="font-semibold">8. Aset dan layanan kedaruratan</h2>
            <p>{latest.aset_kedaruratan || "—"}</p>
          </section>
        </>
      ) : (
        <p className="mt-4 text-sm">Belum ada kaji cepat.</p>
      )}

      <footer className="mt-12 text-sm">
        <p>Penandatangan: {ttdNama ?? "Kepala Pelaksana BPBA"}</p>
        <p>{ttdPangkat}</p>
        <p>NIP {ttdNip ?? "—"}</p>
      </footer>
      <p className="no-print mt-8 text-sm text-[var(--text-dim)]">Gunakan cetak browser (Ctrl+P) untuk PDF.</p>
    </article>
  );
}
