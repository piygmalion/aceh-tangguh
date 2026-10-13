# FE-73b — jepit popup ke area peta bebas

Agent: frontend
Gelombang: visual
Status: diverifikasi

## Niat

- Tujuan: Popup desktop di 1440 tetap di area peta yang bebas, 8px dari tepi kolom kiri (kontrol zoom, legenda status, tombol Pengaturan) dan dari panel Layer kanan, termasuk setelah geser selesai dan momentum berhenti. Di beranda 390, isi kartu "Menderita dan mengungsi" tidak tertutup FAB Tanggapi saat digulir; FAB tetap di bawah 16px + safe-area. Roda mouse di dalam lembar telepon menggulir lembar dan tidak mengubah zoom peta. Kepala dan pegangan lembar tidak bisa diseleksi.
- Berkas: `MapFeatureCard.tsx`, `MapViewport.tsx`, `MapFeatureSheet.tsx`, `DataHero.tsx`, `globals.css`, `map-sheet.ts`, `home-fab-reserve.ts`, uji, jurnal.
- Langkah: Ukur batas kiri dari kotak chrome kiri dan kontrol zoom, batas kanan dari panel Layer, lalu geser kartu ke dalam batas itu. Ulangi jepitan pada `aceh:map-move` dan dua bingkai sesudah `moveend`. Beri padding kanan 3.75rem pada pita angka di bawah 768. Pada roda di lembar, `preventDefault` lalu tambah `scrollTop` badan lembar. `user-select: none` pada kepala dan pegangan.
- Cara membuktikan: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`. Tangkapan 1440 geser kiri dan kanan dengan kotak kartu versus kontrol dan panel. Tangkapan beranda 390 saat kartu lewat di bawah FAB. Roda di lembar: `scrollTop` > 0, zoom tetap.
- Risiko: Jepitan ikut menggeser kartu yang sedang di tengah. Padding kanan menggeser garis spark di semua sel pita, bukan hanya sel yang tertutup. Angka korban dikarang.

## Bacaan ulang niat

Panel Layer desktop mulai di x 1116 pada 1440 (`md:right-3` + lebar 19.5rem). Legenda status dan Pengaturan ada di `[data-map-chrome="settings"]` kiri bawah, kontrol zoom di kiri atas. Keduanya kolom kiri yang harus dikecualikan, plus margin 8px. Geser 560px hanya bukti, bukan satu-satunya jarak. FAB beranda tetap `bottom: 1rem + safe-area`, `right-3`, 56px; isi pita harus berakhir di kiri FAB dikurangi 8px. Badan kartu di dalam lembar memakai `overflow-y: auto` dan `overscroll-behavior: contain`, jadi roda tidak menembus ke `[data-sheet-body]`. Gulir harus terjadi di badan lembar.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `MapFeatureCard.tsx` | `freeMapHorizontalBounds` mengecualikan chrome kiri dan panel Layer, margin 8px. Jepitan diulang dua bingkai sesudah `aceh:map-move`. |
| `MapViewport.tsx` | `moveend` mengirim `aceh:map-move` lagi pada dua bingkai berikutnya, setelah momentum. |
| `DataHero.tsx`, `home-fab-reserve.ts` | Pita angka `max-md:pr-[3.75rem]` (60px) supaya isi berakhir di kiri FAB. |
| `MapFeatureSheet.tsx`, `map-sheet.ts`, `globals.css` | Roda menambah `scrollTop` badan lembar dan `preventDefault`. Kepala dan pegangan `user-select: none`. Badan kartu di dalam lembar tidak lagi menjadi penggulir. |

## Bukti

```
1440×900. Legenda status x 16, y 528, 282×300, kanan 298.
Pengaturan x 16, y 840, 131×44. Zoom x 0, y 96, 41×99.
Panel Layer x 1116, y 96, 312×792.

Geser kiri 560px. Penanda x 556 → -4. Kartu x 306, y 522, 336×362, kanan 642.
Jarak ke legenda = 8px. Tidak berpotongan dengan legenda, Pengaturan, zoom, atau panel.

Geser kanan sesudahnya (penanda x -4 → 1116). Kartu x 772, y 522, 336×362, kanan 1108.
Panel kiri 1116. Jarak = 8px. Tidak berpotongan.

Beranda 390. FAB Tanggapi x 322, y 772, 56×56. Jarak ke tepi bawah = 16px.
padding-right pita = 60px.
Catatan "Menderita" x 29, y 784, 272×33, kanan 301. Jarak ke FAB = 21px. Tidak berpotongan, padahal catatan berada di pita vertikal FAB.
Spark x 29, y 748, 272×32, kanan 301. Jarak ke FAB = 21px. Tidak berpotongan.

Roda di lembar, deltaY 400. scrollTop 0 → 374 (scrollHeight 772, clientHeight 398). Zoom tetap 18.
user-select kepala lembar = none.

npx tsc --noEmit → exit 0
npm test → 963 pass, 0 fail
npm run lint → exit 0
npm run build → exit 0
```

## Bacaan ulang bukti versus kriteria

- [x] Kartu 1440 setelah geser kiri tidak melewati kolom kiri, margin 8px
- [x] Kartu 1440 setelah geser kanan tidak menutup panel Layer, margin 8px
- [x] Jepitan diulang setelah move end
- [x] Catatan dan spark "Menderita dan mengungsi" tidak tertutup FAB saat digulir
- [x] FAB tetap di bawah 16px + safe-area
- [x] Roda di lembar menaikkan scrollTop dan zoom tetap
- [x] Kepala dan pegangan lembar `user-select: none`

## Keputusan

selesai
