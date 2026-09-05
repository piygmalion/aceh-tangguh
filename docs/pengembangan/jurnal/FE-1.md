# FE-1 — bagian SIK beranda ikut berpindah bahasa

Agent: frontend
Gelombang: 1
Status: selesai

## Niat

- Tujuan: Locale `en` tidak boleh menampilkan judul, deskripsi, filter, dan tautan berbahasa Indonesia pada bagian kejadian operasional beranda. Semua label UI di `OperationalStatsSection` lewat next-intl namespace baru `sikStats`.
- Berkas:
  - `src/components/sik/OperationalStatsSection.tsx`
  - `messages/id.json` (hanya menambah kunci `sikStats`)
  - `messages/en.json` (hanya menambah kunci `sikStats`)
- Langkah:
  1. Tambah namespace `sikStats` di kedua berkas pesan, tanpa menimpa kunci yang sudah ada.
  2. Kunci wajib: `title`, `description`, `countLabel`, `allTypes`, `viewDisasterData`, `destanaStatus`, `kabupatenPlaceholder`.
  3. Di komponen: `useTranslations("sikStats")` menggantikan string UI hardcoded.
  4. Tidak menerjemahkan isi data (nama kejadian, jenis dari Juklak, angka, fallback nama wilayah "Aceh") — itu bukan label UI.
- Cara membuktikan:
  - Grep komponen: tidak ada string Indonesia untuk label UI.
  - Setiap `t("…")` di komponen punya pasangan kunci di `id.json` dan `en.json`.
  - Buka `/id` dan `/en` di browser (server dev jika hidup); bandingkan judul dan tautan bagian `#sik`.
- Risiko:
  - Menimpa kunci pesan yang sudah ada — dicegah dengan hanya menambah objek `sikStats`.
  - Menerjemahkan nama jenis bencana resmi — tidak dilakukan.
  - Server dev tidak hidup — catat di bukti dan tetap pastikan tidak ada string ID hardcoded.

## Bacaan ulang niat

Niat bisa dijalankan tanpa tebakan: tujuh teks wajib sudah disebut di brief, namespace `sikStats` sesuai contoh brief, berkas terbatas pada tiga yang diizinkan. Nilai ID untuk kunci baru menyalin teks yang sekarang hardcoded agar `/id` tidak berubah. Nilai EN adalah salinan Inggris, bukan tebakan data resmi. Fallback `"Aceh"` dan `toLocaleDateString("id-ID")` tetap karena bukan label UI yang diminta brief.

## Perubahan

| Berkas | Ubah |
| --- | --- |
| `src/components/sik/OperationalStatsSection.tsx` | `useTranslations("sikStats")` untuk tujuh label UI |
| `messages/id.json` | objek baru `sikStats` (nilai Indonesia asli) |
| `messages/en.json` | objek baru `sikStats` (salinan Inggris) |

## Bukti

Putaran 1.

Grep label UI di komponen: tidak ada `Kejadian operasional Aceh`, `Jumlah kejadian`, `Semua jenis`, `Lihat data bencana`, `Status Destana`, `Kabupaten/Kota`, `Ringkasan kejadian`.

Pemindai `t()`:

```
used=title,description,kabupatenPlaceholder,allTypes,countLabel,viewDisasterData,destanaStatus
idKeys=title,description,countLabel,allTypes,viewDisasterData,destanaStatus,kabupatenPlaceholder
enKeys=title,description,countLabel,allTypes,viewDisasterData,destanaStatus,kabupatenPlaceholder
missingId=[]
missingEn=[]
sameKeys=true
```

Server Next.js di `http://localhost:3120`. Tab browser IDE tidak bisa dipegang (navigate menolak tab). Pengganti: unduh HTML SSR.

`GET /id` 200: "Kejadian operasional Aceh" 2, "Jumlah kejadian" 2, "Lihat data bencana" 2, "Status Destana" 2, "Semua jenis" 3, "Kabupaten/Kota" 2. Nol untuk salinan Inggris. Nol `MISSING_MESSAGE` / `Could not resolve`.

`GET /en` 200: "Aceh operational incidents" 2, "Incident count" 2, "View disaster data" 2, "Destana status" 2, "All types" 3, "District/City" 2. Nol untuk string ID wajib. Nol `MISSING_MESSAGE` / `Could not resolve`.

## Bacaan ulang bukti versus kriteria

- [x] Tidak ada string Indonesia hardcoded di komponen untuk label UI — tujuh label lewat `t()`; sisa string adalah data (`j.jenis`, `row.nama_kejadian`) atau fallback wilayah `"Aceh"`.
- [x] `/en` menampilkan salinan Inggris; `/id` tetap Indonesia — terbukti dari HTML SSR di atas.
- [x] Pemindai `t()` tidak menambah kunci hilang — `missingId`/`missingEn` kosong; kunci id=en.
- [x] Verifikasi browser `/id` dan `/en` — tab IDE gagal; HTML SSR kedua rute dibandingkan. Judul bagian berbeda locale.

## Keputusan

selesai
