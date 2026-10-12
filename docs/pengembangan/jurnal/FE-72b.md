# FE-72b — tindak lanjut chrome peta

Agent: frontend
Gelombang: visual
Status: diverifikasi

## Niat

- Tujuan: ⓘ atribusi di telepon hanya naik sebesar safe-area, karena `.map-stage` sudah punya `pb-[4.25rem]`. Popup tidak menutup ⓘ dan tidak terpotong di tepi kiri. Di bawah 768 tidak ada gelembung undangan Tanggapi, hanya tombol bulat. Header popup yang sudah selesai dimuat ringkas di atas 24px dan kembali di bawah 8px.
- Berkas: `globals.css`, `MapFeatureCard.tsx`, `GuideBot.tsx`, `src/lib/fe-72b-map-followup.test.ts`, jurnal dan `report.json`.
- Langkah: `bottom` atribusi hanya `var(--map-safe-area-bottom, env(safe-area-inset-bottom, 0px))`. Cadangan tinggi popup memakai inset itu. Kartu dijepit minimal 8px dari kiri dan kanan. Telepon tidak pernah menampilkan gelembung.
- Cara membuktikan: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`. Tangkapan di `docs/pengembangan/jurnal/fe-72b/`.
- Risiko: Desktop kehilangan gelembung. Kanvas kehilangan `tabindex`. Chip kehilangan garis.

## Bacaan ulang niat

Pengangkatan 4.25rem kedua dihitung dua kali dan mengangkat ⓘ sekitar 68px terlalu tinggi. Cadangan popup tetap memakai `stripHeight + 8` dan tidak kurang dari inset. Gelembung desktop tetap 6 detik, tombol tutup, dan hilang saat digulir. Tidak ada IntersectionObserver untuk telepon. Ambang header tetap 24 dan 8, bukan posisi roda 40/20. Ubin, gaya peta, data, API, env, fixture, `RisikoLadder.tsx`, dan `peta-teaser-paths.ts` tidak disentuh.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `globals.css` | Di bawah 768, `bottom` atribusi hanya inset. `z-index: 40` agar ketukan ⓘ tidak tertangkap tombol lapor. |
| `MapFeatureCard.tsx` | `popupBottomReserve` menyisakan inset. `popupHorizontalShift` menjepit kartu. |
| `GuideBot.tsx` | `tanggapiBubbleOnViewport` menolak telepon. Observer grafik tahun dihapus. |
| `src/lib/fe-72b-map-followup.test.ts` | Uji keempat butir HOLD. |

## Bukti

```
390 tanpa inset. ⓘ x 356, y 742, 24×24. bottom terhitung 0px. Pegangan y 768. Tidak berpotongan.
Ketukan mengenai SUMMARY.maplibregl-ctrl-attrib-button. Kanvas tabindex 0.

390, inset semu 34px. ⓘ x 356, y 708, 24×24. bottom terhitung 34px. Pegangan y 742. Tidak berpotongan.
Ketukan mengenai SUMMARY.maplibregl-ctrl-attrib-button.

Popup terbuka, inset 34px. Kartu bawah y 690, ⓘ y 708. Kartu tidak menutup ⓘ.
Permintaan fitur 200 untuk ACEH-2023-0276. Judul "Kebakaran Hutan dan Lahan — Aceh Besar", bukan "Memuat keterangan…".
Detail ada. Sumber terlihat: y 616–677, teks "Sumber bpba.acehprov.go.id Data Kejadian BPBA".

Kartu di tepi kiri, penanda x 16. Saat memuat: kiri 8, kanan 344, translateX(160px).
Setelah isi masuk: kiri 8, kanan 344. Margin kiri dan kanan minimal 8px.

Histeresis pada kartu yang sudah dimuat. Ambang kode: ringkas di atas 24px, kembali di bawah 8px.
Gulir 0 kicker flex; 16 tetap flex; 32 none; 16 tetap none; 0 flex lagi.

Beranda 390 setelah digulir: grafik y -384, gelembung 0, tombol "Buka Tanggapi" tetap.
Beranda 1440: gelembung x 1160, y 669, 256×83.

npx tsc --noEmit → exit 0
npm test → 949 pass, 0 fail
npm run lint → exit 0
npm run build → exit 0
```

## Bacaan ulang bukti versus kriteria

- [x] ⓘ di y sekitar 708 dengan inset 34px, dan bisa diketuk tanpa inset maupun dengan inset
- [x] Popup tidak menutup atribusi
- [x] Kartu di 390 tetap di dalam layar saat memuat dan setelah isi masuk
- [x] Telepon tidak menampilkan gelembung undangan
- [x] Desktop tetap menampilkan gelembung
- [x] Histeresis 24px / 8px pada kartu yang selesai dimuat, dengan Sumber terlihat
- [x] Uji fe-70, fe-71, dan fe-72 tetap hijau

## Keputusan

selesai
