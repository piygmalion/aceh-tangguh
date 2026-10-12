# FE-72b — tindak lanjut chrome peta

Agent: frontend
Gelombang: visual
Status: diverifikasi

## Niat

- Tujuan: ⓘ atribusi tetap terlihat di atas pegangan Panel layer pada telepon dengan safe-area. Legenda status di atas peta tersembunyi saat panel terbuka dan tertutup bawaan di bawah 768. Membuka panel tidak memindahkan fokus ke kanvas. Header popup tidak berkedip di ambang gulir. Menutup dari panel juga menutup popup overlay dan FIRMS. Gelembung Tanggapi di 390 tidak menutup grafik "Kejadian per tahun".
- Berkas: `globals.css`, `MapWorkspace.tsx`, `StatusLegend.tsx`, `MapViewport.tsx`, `MapFeatureCard.tsx`, `GuideBot.tsx`, `YearBars.tsx`, `src/lib/fe-72b-map-followup.test.ts`, jurnal dan `report.json`.
- Langkah: Angkat kontrol atribusi sebesar tinggi pegangan ditambah `env(safe-area-inset-bottom)`. Sembunyikan legenda atas saat `layerPanelOpen`. Tombol membuka chip. Lewati fokus kanvas saat panel menutup popup. Histeresis 24px / 8px. Amati grafik tahun dengan IntersectionObserver hanya di bawah 768.
- Cara membuktikan: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`. Tangkapan di `docs/pengembangan/jurnal/fe-72b/`.
- Risiko: Desktop kehilangan gelembung. Kanvas kehilangan `tabindex`. Chip kehilangan garis.

## Bacaan ulang niat

Pengangkatan atribusi hanya di bawah 768. Desktop tidak memakai offset itu. Legenda desktop di tumpukan bawah tetap terbuka. Fokus kanvas tetap ada saat pengguna menutup kartu sendiri, bukan saat Panel layer yang menutupnya. Gelembung desktop tetap muncul tanpa menunggu grafik keluar dari layar. Tidak ada `setAttribute` pada kanvas. Ubin, gaya peta, data, API, env, fixture, `RisikoLadder.tsx`, dan `peta-teaser-paths.ts` tidak disentuh.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `globals.css` | Di bawah 768, atribusi naik `4.25rem` ditambah `env(safe-area-inset-bottom)`. |
| `MapWorkspace.tsx` / `StatusLegend.tsx` | Legenda telepon tertutup sampai tombol dibuka, dan `hidden` saat panel terbuka. |
| `MapViewport.tsx` | Panel menutup popup fitur, overlay, dan FIRMS tanpa memindahkan fokus ke kanvas. |
| `MapFeatureCard.tsx` | Header ringkas di atas 24px, kembali di bawah 8px, ditahan di antaranya. |
| `GuideBot.tsx` / `YearBars.tsx` | Di bawah 768 gelembung menunggu grafik tahun keluar dari layar. |
| `src/lib/fe-72b-map-followup.test.ts` | Uji keempat butir. |

## Bukti

```
390, inset semu 34px. ⓘ x 356, y 640, 24×24. Pegangan y 742. Kotak tidak berpotongan.
Ketukan di tengah ⓘ mengenai tombol atribusi. bottom terhitung 102px (4.25rem + 34px). Kanvas tabindex 0.

Legenda tertutup: x 56, y 92, 66×39, data-legend-collapsed true.
Legenda terbuka: empat chip, garis rgb(17, 17, 17), masing-masing berikon.
Panel terbuka: legenda display none, kotak 0×0.

Popup: gulir 0 kicker flex; 20 tetap flex; 40 none; 20 tetap none; 0 flex lagi.
Membuka panel: fokus aria-label "Tutup panel layer", kanvas tidak fokus, kartu hilang.

Beranda 390 lipatan: grafik "Kejadian per tahun" di y 461, gelembung tidak ada.
Setelah digulir: grafik y -378, di luar layar. Gelembung x 98, y 613, 280×83, tombol "Tutup undangan Tanggapi".

1440: pengaturan dan "+" tetap. Legenda desktop terbuka (tinggi 250). Atribusi bottom 0. Kanvas tabindex 0.

npx tsc --noEmit → exit 0
npm test → 948 pass, 0 fail
npm run lint → exit 0
npm run build → exit 0
```

## Bacaan ulang bukti versus kriteria

- [x] ⓘ terlihat dan bisa diketuk di atas pegangan dengan inset 34px
- [x] Legenda tersembunyi saat panel terbuka, dan tertutup bawaan di 390
- [x] Chip tetap berlabel, berikon, bergaris #111
- [x] Fokus tetap di tombol panel
- [x] Histeresis header 24px / 8px
- [x] Panel menutup popup overlay dan FIRMS di kode
- [x] Gelembung tidak menutup grafik tahun, dan muncul setelah digulir
- [x] Desktop peta tidak berubah
- [x] Uji fe-70, fe-71, dan fe-72 tetap hijau

## Keputusan

selesai
