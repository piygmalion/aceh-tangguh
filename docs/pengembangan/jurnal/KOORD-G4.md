# KOORD-G4 — bacaan ulang koordinator gelombang 4

Agent: koordinator
Gelombang: 4
Status: selesai

## Niat

Membaca ulang jurnal AN-6, FE-7, FE-8 dan mencocokkan kode ke kontrak AN-6. Tidak mengerjakan DATA-4. Tidak mengode AN-7 / AN-8 / SDI.

## Bacaan ulang niat

Verifikasi, bukan implementasi baru. FE-8 hanya sah jika AN-6 `siap-kode` — sudah terpenuhi sebelum FE-8 dijalankan.

## Bukti

- FE-7: README dan `security/attack-surface.md` tidak lagi mendaftar `GET /api/hazards`; `qk.hazards` dan namespace `messages.hazards` dihapus; komentar `?hazard=` tetap alias jenis; README markers tidak mengklaim merge Tatonas.
- AN-6: rute `/admin/sik/kejadian/calon`; bukan sidebar baru; guard modul `kejadian`; tujuh kolom; form terima/tolak sesuai AN-4; popup peta **bukan FE-8**; `sikCalon` terkunci; API BE-6 cukup.
- FE-8: page guard + `isKabScoped` saja; pathname di `routing.ts`; tautan header + kartu overview; GET `?status=` tiga tab; `kode_jenis` Number; waktu ISO WIB tanpa `now()`; 200 memakai `kejadian.id`; tolak `{}` + tetap draf; `AdminShell` tidak menambah item; tidak ada POST create / tombol peta. Namespace `sikCalon` 44 kunci, teks sesuai tabel.
- `npm test` 278 lulus; `tsc --noEmit` lulus.
- Browser: tidak diverifikasi end-to-end. Dev server di :3122 tidak menjawab dalam 8 detik; tidak ada sesi staf di koordinator. Guard halaman dibaca dari sumber.

## Bacaan ulang bukti versus kriteria

- [x] AN-6 tetap kontrak `siap-kode`; FE-8 tidak menambah opsi
- [x] FE-7 merapikan sisa hazards tanpa menghapus `?hazard=`
- [x] Calon tidak membuat kejadian `aktif`; tidak menebak Tatonas/KRB/korban
- [x] Uji hijau
- [x] SDI/Destana tidak dikode di G4

## Catatan terbuka (bukan blocker gelombang 4)

DATA-4 menunggu jawaban penyedia (AN-3).

`panduan.s8.body` (en) masih menyebut GET `/api/hazards`.

UI terima/tolak belum dicoba di browser dengan sesi staf.

Naskah AN-7 (Destana) dan AN-8 (SDI) ada di gelombang kemudian. Jangan dikode sampai koordinator membuka gelombang itu.

Produksi perlu: migrasi `20260913`–`20260916`; `OVERLAY_CRON_SECRET` / `OVERLAY_REFRESH_URL`; opsional `LAPORAN_PII_KEY_ID` / `LAPORAN_PII_KEYS`. Tabel `overlay_calon_kejadian` (`20260915`) wajib sebelum UI calon berguna di produksi.

## Keputusan

selesai
