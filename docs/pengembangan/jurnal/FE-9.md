# FE-9 — banner dinamis + katalog SDB

Agent: frontend
Gelombang: 5
Status: selesai

## Niat

Salin keputusan AN-8 §5 (bukan opsi). Pakai API BE-9 dan BE-10 yang sudah ada. Jangan merancang kontrak baru. Tidak mengubah `src/app/api/**`. Tidak commit.

- Tujuan: Dua permukaan staf saja — banner jumlah peringatan dinamis di daftar kejadian, dan halaman baca katalog SDB di `/admin/sik/sdb` — persis `jurnal/AN-8.md` §5. Jangan mengerjakan UI calon (FE-8).
- Berkas (hanya ini):
  - `src/i18n/routing.ts` — pathname `"/admin/sik/sdb": "/admin/sik/sdb"` (pengecualian typed Link, sama calon)
  - `src/app/[locale]/admin/(console)/sik/sdb/page.tsx` — server: `requireStaffPage` + `canAccessModule(profile, "kejadian")` → `SikForbidden`; render `<SdbKatalogList />`
  - `src/components/sik/SdbKatalogList.tsx` — klien baru; GET `/api/sik/sdb/katalog`; tabel baca
  - `src/components/sik/KejadianOpsList.tsx` — fetch terpisah GET `/api/sik/kejadian/peringatan-dinamis`; banner jika `count > 0`; tautan SDB sejajar tautan calon
  - `messages/id.json`, `messages/en.json` — namespace akar `sikSdb` saja; jangan menimpa kunci lain
  - `docs/pengembangan/jurnal/FE-9.md`
  - `docs/pengembangan/STATUS.md` — HANYA baris FE-9
- Tidak diubah: `CalonKejadianList.tsx`; `sik/kejadian/calon/page.tsx`; `AdminShell` `items[]` (jangan menambah href `/admin/sik/sdb`); overview admin; API; migrasi; `crypto.ts`; overlay; DATA-4; AN-7; FE-8.
- Langkah (satu perilaku per butir AN-8 §5):
  1. Banner di `KejadianOpsList` (halaman `/admin/sik/kejadian`). Fetch terpisah dari daftar kejadian. Body API `{ count, items: [{ id, nama_kejadian, kabupaten, kode_kabupaten }] }`. Gerbang API `requireOpsApi`. Jika 401/403 (desa/penilai/bukan ops): jangan tampilkan banner, jangan error keras yang merusak daftar. Gagal lain (5xx/jaringan): sama — tanpa banner, daftar tetap. Jika `count === 0` atau belum ada angka sah: jangan render banner. Teks banner lewat `sikSdb` dengan interpolasi `{count}`. Jangan mengubah filter/tabel kejadian kecuali menambah banner + tautan SDB.
  2. Tautan SDB di header daftar, sejajar tautan calon: `<Link href="/admin/sik/sdb"><Button size="sm" variant="outline">{tSdb("navFromList")}</Button></Link>`. Bukan item sidebar. Bukan rute `/admin/sik/kejadian/sdb`.
  3. Halaman staf `/admin/sik/sdb`. Guard sama calon/daftar kejadian. Pathname di `routing.ts`.
  4. Halaman SDB = GET `/api/sik/sdb/katalog` (staf), `cache: "no-store"`. Respons `{ items }`. Tabel baca kolom: kunci, judul, konsep, definisi, satuan, klaster, kelas_akses, produsen, periode_kirim, kode_referensi, tabel_sumber. `satuan` null → `—` (tanda data, sama daftar kejadian). Jangan form/edit `kelas_akses`. Jangan PATCH katalog. Jangan UI jadwal. Jangan UI validasi. Jangan POST BNPB / `data.bnpb`. Kosong = `sikSdb.empty`. Gagal = `sikSdb.loadError` (jangan kosongkan seolah sukses). Muat = `sikSdb.loading`.
  5. `kelas_akses` tampilan saja lewat kunci `kelasTerbuka` / `kelasTerbatas` / `kelasRahasia`. Nilai lain (termasuk `sangat_rahasia` jika lolos) tampil apa adanya sebagai data, bukan string UI baru.
  6. i18n namespace BARU `sikSdb` di `id.json` dan `en.json`. `/en` Inggris, `/id` Indonesia. Sertakan: judul halaman, deskripsi, tautan dari daftar, label banner `{count}`, label kolom tabel, kosong, error muat, loading, tiga label kelas akses. Jangan menimpa `sikCalon`, `admin`, `sikStats`, atau namespace lain.
- Cara membuktikan:
  - Grep: tidak ada `/admin/sik/sdb` di `AdminShell.tsx` `items`. Ada di `routing.ts`. `CalonKejadianList` tidak berubah (diff kosong — jangan sentuh).
  - Grep komponen SDB: tidak ada PATCH, tidak ada input `kelas_akses`, tidak ada `data.bnpb`.
  - Baca sumber: banner hanya `{count > 0}`; 401/403 tidak set error daftar.
  - Jika ada pemindai kunci i18n, jalankan. `npx tsc --noEmit`. `npm test` (PowerShell: `;`).
  - Browser: coba `/id/admin/sik/kejadian` dan `/id/admin/sik/sdb`. Jika tidak ada sesi staf / server tidak jalan: catat tidak diverifikasi browser. Jangan mengarang sesi.
- Risiko:
  - Item `AdminShell` baru — dilarang.
  - Mengubah `CalonKejadianList` / FE-8 — dilarang.
  - Form PATCH `kelas_akses`, UI jadwal/validasi, POST BNPB — dilarang.
  - Error banner 401/403 merusak daftar kejadian — dilarang.
  - Menimpa kunci i18n lama; mengubah API; DATA-4; AN-7.

## Bacaan ulang niat

Dibaca dari awal sebagai orang yang tidak menulisnya. Dua permukaan: (1) banner jumlah di daftar kejadian hanya jika GET peringatan mengembalikan `count > 0`, fetch terpisah, 401/403 diam; (2) halaman `/admin/sik/sdb` baca katalog, guard modul kejadian, tautan dari header daftar sejajar calon. Tidak ada sidebar baru. Tidak ada form. Namespace `sikSdb` saja. FE-8 tidak disentuh. BE-9/BE-10 sudah selesai — pakai GET yang ada. Siap kode.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `src/i18n/routing.ts` | pathname `"/admin/sik/sdb"` |
| `src/app/[locale]/admin/(console)/sik/sdb/page.tsx` | Guard kejadian; `<SdbKatalogList />` |
| `src/components/sik/SdbKatalogList.tsx` | GET katalog; tabel baca 11 kolom; label kelas akses |
| `src/components/sik/KejadianOpsList.tsx` | Fetch peringatan terpisah; banner jika `count > 0`; tautan SDB sejajar calon |
| `messages/id.json`, `messages/en.json` | Akar `sikSdb` (21 kunci); `sikCalon` tidak ditimpa |
| `docs/pengembangan/STATUS.md` | Baris FE-9 → selesai |

`AdminShell` items tidak diubah. `CalonKejadianList.tsx` tidak disentuh. `src/app/api/**` tidak diubah.

## Bukti

Putaran 1 — niat disalin dari AN-8 §5 + brief FE-9. Bacaan ulang niat: siap kode.

Putaran 2 — kode sesuai niat.

Baca sumber:

- Page SDB: `requireStaffPage` + `canAccessModule(profile, "kejadian")` → `SikForbidden`; render hanya `<SdbKatalogList />`.
- `routing.ts` memuat `"/admin/sik/sdb": "/admin/sik/sdb"`.
- Grep `AdminShell.tsx` `/admin/sik/sdb` = tidak ada. `items[]` tetap 11 href lama (kejadian, bukan sdb).
- `KejadianOpsList`: `Link href="/admin/sik/sdb"` + `Button size="sm" variant="outline"` + `tSdb("navFromList")` sejajar tautan calon. Fetch `GET /api/sik/kejadian/peringatan-dinamis` terpisah dari `GET /api/sik/kejadian`. Banner `{peringatanCount > 0 ? … tSdb("banner", { count }) : null}`. 401/403/`!res.ok`/jaringan → `setPeringatanCount(0)` saja; tidak memanggil `setError` daftar.
- `SdbKatalogList`: `GET /api/sik/sdb/katalog` + `cache: "no-store"`. Badan `{ items }`. Tanpa PATCH, tanpa `<input>`, tanpa jadwal/validasi/`data.bnpb`. `kelas_akses` hanya label `t("kelasTerbuka|Terbatas|Rahasia")`.
- `git diff` `CalonKejadianList.tsx` dan `sik/kejadian/calon/page.tsx` = kosong.

Pemindai `sikSdb` (skrip sementara, dihapus setelah jalan):

```
used=banner,colDefinisi,colJudul,colKelasAkses,colKlaster,colKodeReferensi,colKonsep,colKunci,colPeriodeKirim,colProdusen,colSatuan,colTabelSumber,empty,kelasRahasia,kelasTerbatas,kelasTerbuka,lead,loadError,loading,navFromList,title
missingId=[]
missingEn=[]
extraId=[]
extraEn=[]
sameKeys=true
```

```
npx tsc --noEmit
# TSC_EXIT=0

npm test
# tests 314
# pass 314
# fail 0
```

Browser: tidak diverifikasi. Namespace `cursor-ide-browser` tidak re-register. Tidak ada kredensial staf di sesi agent ini. `GET http://localhost:3122/id/admin/sik/kejadian` dan `/id/admin/sik/sdb` (redirect manual, 20s lalu 60s) = `AbortError`. Probe `/id/admin/login` (8s) juga abort — proses `next dev --port 3122` masih `running` tetapi tidak menjawab. Jangan mengarang sesi. Andalan: tsc + uji + baca sumber + grep.

## Bacaan ulang bukti versus kriteria

- [x] Banner hanya jika `count > 0`; 401/403 diam, daftar utuh — sumber `peringatanCount > 0`; fetch peringatan tidak `setError`
- [x] `/admin/sik/sdb` di routing; guard staf + modul kejadian; bukan item AdminShell — grep + page
- [x] Tabel katalog GET `{ items }`; tanpa PATCH / input kelas_akses / jadwal / validasi / BNPB — grep komponen SDB
- [x] i18n `sikSdb` di id+en; tidak menimpa namespace lain — 21 kunci sama; `sikCalon` tetap
- [x] `CalonKejadianList` tidak berubah — diff kosong
- [x] `tsc` + `npm test` hijau; browser dicatat tidak diverifikasi (bukan lulus)

## Keputusan

selesai
