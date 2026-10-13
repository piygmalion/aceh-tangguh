# FE-73b — jepit popup ke area peta bebas

Agent: frontend
Gelombang: visual
Status: diverifikasi

## Niat

- Tujuan: Pada 1440, popup desktop tetap di area peta bebas. Area itu adalah kanvas dikurangi kotak legenda Status, tombol Pengaturan, panel Layer, dan strip atribusi, plus margin 8px. Zoom tidak masuk hitungan. Di beranda 390, isi kartu "Menderita dan mengungsi" tidak tertutup FAB Tanggapi; FAB tetap di bawah 16px + safe-area. Roda di dalam lembar telepon menggulir wadah yang benar-benar meluap, dan zoom peta tidak berubah. Bukti roda harus dari build produksi (`next start`), dengan peristiwa roda sungguhan. Menyeret lembar tidak memindahkan fokus ke kepala lembar, dan logo "SIK Aceh" tidak menampilkan cincin fokus. Kepala dan pegangan lembar tidak bisa diseleksi.
- Berkas: `MapFeatureCard.tsx`, `MapViewport.tsx`, `MapFeatureSheet.tsx`, `DataHero.tsx`, `globals.css`, `map-sheet.ts`, `home-fab-reserve.ts`, uji, jurnal.
- Langkah: Ukur kanvas, lalu kotak legenda, tombol Pengaturan, panel Layer, dan strip atribusi. Geser kartu keluar dari kotak yang diperlebar 8px, lalu jepit ulang ke dalam kanvas. Jika kartu lebih tinggi daripada sela yang tersisa, pendekkan `maxHeight`. Ulangi setelah `aceh:map-move` dan dua bingkai sesudah `moveend`. Tinggi maksimum diukur pada posisi tata letak, bukan pada posisi yang sudah digeser. Roda ditangkap di `window` pada fase capture, `preventDefault`, lalu `scrollTop` ditulis pada leluhur yang `overflow` dan `scrollHeight`-nya melebihi `clientHeight`. `pointerdown` pada kepala memanggil `preventDefault` supaya fokus tidak pindah, lalu blur jika fokus jatuh ke kepala atau logo.
- Cara membuktikan: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`, lalu `next start`. Tangkapan 1440 geser kiri dan kanan dengan kotak kartu versus legenda, Pengaturan, panel, dan atribusi. Roda produksi: `scrollTop` wadah lembar naik, zoom tetap. Seret pegangan: logo tidak `:focus-visible`.
- Risiko: Jepitan ikut menggeser kartu yang sedang di tengah. Kartu yang lebih tinggi daripada sela bebas menjadi lebih pendek. Angka korban dikarang.

## Bacaan ulang niat

Kanvas pada 1440 berakhir di x 1112 karena stage memakai `md:pr-[20.5rem]`. Panel Layer mulai di x 1116. Legenda status dan tombol Pengaturan ada di `[data-map-chrome="settings"]`. Strip atribusi adalah `.maplibregl-ctrl-bottom-right`. Zoom tidak dikurangi dari area bebas. MapLibre memanggil `preventDefault` pada roda, tetapi pendengarnya hanya di wadah kanvas, bukan di `window`. Lembar adalah saudara peta, jadi roda yang sasarannya di dalam lembar tidak sampai ke kanvas. Pendengar capture kita yang membatalkan gulir asli, jadi `scrollTop` harus ditulis pada elemen yang sama dengan yang meluap di produksi: `[data-sheet-body]`. Badan kartu di dalam lembar `overflow: visible`. Fokus kepala `tabIndex={0}` bisa jatuh ke tautan pertama, logo SIK Aceh, saat simpul fokus hilang.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `MapFeatureCard.tsx` | Area bebas = kanvas minus legenda, tombol Pengaturan, panel Layer, dan atribusi, margin 8px. Kartu yang tidak muat dipendekkan. Tinggi diukur tanpa transform jepitan. |
| `MapViewport.tsx` | `moveend` mengirim `aceh:map-move` lagi pada dua bingkai berikutnya. |
| `DataHero.tsx`, `home-fab-reserve.ts` | Pita angka `max-md:pr-[3.75rem]` (60px). |
| `MapFeatureSheet.tsx`, `map-sheet.ts`, `globals.css` | Roda di `window` capture menulis `scrollTop` wadah yang meluap dan `preventDefault`. Kepala dan pegangan `user-select: none`. Seretan tidak menaruh fokus di kepala atau logo. |

## Bukti

```
Produksi: npm run build, lalu next start. Penanda ACEH-2023-0276, zoom 16.

1440×900. Kanvas x 0, y 96, kanan 1112, bawah 900.
Legenda status x 16, y 528, 282×300, kanan 298.
Pengaturan x 16, y 840, 131×44.
Panel Layer x 1116, y 96, 312×792.
Atribusi x 833, y 856, 279×44.

Geser kiri 560px. Kartu x 306, y 522, 336×362, kanan 642, bawah 884.
Jarak ke legenda = 8px. Piksel y 650: legenda sampai x 296, peta x 298–304, kartu dari x 306.
Tidak berpotongan dengan legenda, Pengaturan, panel, atau atribusi yang diperlebar 8px.

Geser kanan. Kartu x 768, y 486, 336×362, kanan 1104, bawah 848.
Jarak ke panel = 12px. Jarak ke atribusi = 8px (bawah kartu 848, atas atribusi 856).
Piksel x 900: kartu sampai y 846, sela y 848–854, atribusi dari y 856.
Tidak berpotongan dengan keempat kotak yang diperlebar 8px.

Roda produksi, peristiwa trusted, deltaY 400, deltaMode 0.
Pendengar kanvas MapLibre tidak terpanggil (hitung 0). defaultPrevented = true dari pendengar window capture.
Wadah gulir: div[data-sheet-body].min-h-0.flex-1.overflow-y-auto.overscroll-contain, overflowY auto.
scrollHeight 772, clientHeight 398, scrollTop 0 → 374.
.badan kartu (.map-feature-card-body) overflowY visible, scrollTop tetap 0.
Zoom tetap 16. Roda di kanvas sesudahnya mengubah zoom 16 → 16.29, dan pendengar kanvas terpanggil.

Seret pegangan. Tinggi lembar 464 → 544 saat tombol masih turun → 717 setelah lepas.
activeElement = canvas peta (aria-label Map), bukan kepala lembar, bukan logo.
Logo SIK Aceh :focus-visible = false, outline-style none.

Beranda 390 (berkas pita tidak berubah pada putaran ini). FAB x 322, y 772, 56×56, 16px dari bawah.
padding-right pita = 60px. Catatan dan spark kanan 301, jarak ke FAB 21px.

user-select kepala lembar = none.

npx tsc --noEmit → exit 0
npm test → 965 pass, 0 fail
npm run lint → exit 0
npm run build → exit 0
```

## Bacaan ulang bukti versus kriteria

- [x] Area bebas = kanvas minus legenda Status, tombol Pengaturan, panel Layer, dan strip atribusi, margin 8px
- [x] Kartu 1440 setelah geser kiri dan kanan tidak masuk kotak yang diperlebar 8px
- [x] Jepitan diulang setelah move end
- [x] Roda produksi menaikkan scrollTop wadah lembar yang sama dengan yang meluap, zoom tetap
- [x] MapLibre preventDefault hanya pada wadah kanvas; roda di lembar tidak sampai ke sana
- [x] Setelah seret, logo SIK Aceh tidak menampilkan cincin fokus
- [x] Catatan dan spark beranda tidak tertutup FAB; FAB tetap di bawah 16px + safe-area
- [x] Kepala dan pegangan lembar `user-select: none`

## Keputusan

selesai
