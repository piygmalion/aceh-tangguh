# KOORD-ECC-S — review uji + browser

Agent: ecc
Gelombang: ECC-S
Status: selesai

## Niat

- Tujuan: Membaca ulang S1–S4 versus [06-skema-kerapian.md](../06-skema-kerapian.md); commit + push hanya jika uji hijau dan tidak ada regresi baru atau konflik di pohon kerja.
- Berkas: jurnal ini; baris STATUS `KOORD-ECC-S`.
- Langkah: `tsc` + `npm test`; browser peta/destana/beranda/admin; tinjau diff; stage hanya tiket ECC + S1–S4.
- Cara membuktikan: perintah, hasil, rute browser, keputusan commit.
- Risiko: men-stage kotoran G17–G20; menulis secret; menimpa `parse.ts`; merge cuaca; force-push.

## Bacaan ulang niat

Review, bukan tiket fitur baru. Jika main sudah maju dengan overlap, catat di bukti; jangan memaksa rebase ke `origin/main` di commit ini.

## Perubahan

Tidak ada perubahan perilaku di luar penutupan STATUS.

## Bukti

### Uji

```
npx tsc --noEmit
→ exit 0

npm test
→ tests 455, suites 118, pass 455, fail 0
```

`src/lib/tatonas/parse.ts` tidak berubah. Tidak ada `127.0.0.1:7256` di `src/`. Cuaca resmi (`/api/weather`) dan inovasi tetap jalur terpisah.

### Browser (dev `http://localhost:3125`)

| Rute | Hasil |
| --- | --- |
| `/id/peta` tab Geospasial | Chip overlay berbahasa Indonesia (Pelabuhan, Perairan, Gempa BMKG, …) + atribusi overlay |
| `/en/peta` tab Geospatial | Chip Inggris (Ports, Waters, BMKG earthquakes, …) + atribusi overlay |
| `/id/destana` | Judul Desa Tangguh Bencana; kartu status tampil |
| `/id` | Dua strip terpisah: Perkiraan cuaca Aceh (BMKG) dan Konteks model AI (eksperimen / WeatherNext 3) |
| `/id/admin/sik/kejadian` tanpa cookie | `307` → `/id/admin/login` |
| `/id/admin/sik/kejadian/calon` tanpa cookie | `307` → `/id/admin/login` |
| Sesi Super Admin di browser | Daftar kejadian menampilkan taut Calon + SDB (bukan item sidebar baru); `/id/admin/sik/kejadian/calon` = Calon kejadian; `/id/admin/sik/sdb` = Katalog SDB |

Akun tidak dikarang. HEAD tanpa sesi tetap 307.

### Diff / stage

Tidak di-stage: `.env`, `.next/`, sibling `../ecc`, `.superdesign/`, halaman Analisis G20, staf G18, strip/API inovasi G19 (kecuali alias cron + skrip upsert DATA-19), `package.json` (`build:weather-inovasi`), panduan, dan kotoran `src/` di luar tiket S1–S4.

`KejadianTable.tsx` di-commit sebagai FE-23 saja (locale). Teaser Analisis G20 dikembalikan ke `KejadianAnalisis` HEAD agar pohon commit tidak bergantung pada modul G20 yang tidak di-stage.

### Main vs cabang

`origin/main` maju (`6e684af` → `6b22ece`: shadcn, footer, tend points, LOD desa). `git merge-tree HEAD origin/main` menghasilkan pohon tanpa konflik pada commit G15–G16. Overlap berkas kerja (messages, tabel kejadian, catalog) akan muncul saat PR ke main — bukan konflik di working tree ini.

### ID

`AN-29` / `AN-30` dipakai ulang: G20 (Analisis) vs ECC-S4 (inovasi / helper kab). Berkas jurnal adalah naskah S4. G20 tetap di FE-25 / BE-28 / uji acceptance.

## Bacaan ulang bukti versus kriteria

- [x] `tsc` hijau
- [x] `npm test` 455 lulus
- [x] Browser peta id/en, destana, dua strip cuaca, admin 307 tanpa sesi + taut calon dengan sesi
- [x] Tidak ada secret / `.next/` / `parse.ts` / merge cuaca
- [x] Tidak ada konflik di pohon kerja; tidak force-push

## Keputusan

selesai — satu commit ECC + S1–S4, lalu `git push -u` cabang `cursor/g15-g16-maritime-kab-scope`.
