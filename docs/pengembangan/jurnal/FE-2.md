# FE-2 — selectedId di URL membuka fitur

Agent: frontend
Gelombang: 1
Status: selesai

## Niat

- Tujuan: Jangan biarkan `selectedId` terurai dari URL tanpa pemakai. Tautan dalam ke satu fitur harus menggerakkan peta dan popup, **atau** parameter dihapus jika tidak akan dipakai.
- **Keputusan (sebelum kode): hapus parameter URL `selected`.** Alasan:
  1. Satu-satunya pembacaan adalah `searchParams.get("selected")` di `useMapUrlState`. Tidak ada penulis `selected` di repo.
  2. `MapWorkspace` tidak meneruskan `state.selectedId`. `MapViewport` tidak menerima dan tidak memakai prop itu.
  3. Tidak ada tautan dalam `?selected=` di `src/`. Tidak ada pemakai yang akan rusak.
  4. Menyambungkan fit/popup sekarang akan menebak identitas fitur (id GeoJSON vs `generateId` MapLibre vs overlay), layer yang harus menyala, dan perilaku cluster — di luar bukti yang ada.
- Berkas:
  - `src/hooks/useMapUrlState.ts` — hentikan pembacaan `selected`; jangan tulis kunci itu.
  - `src/components/map/MapViewport.tsx` — diperiksa; tidak diubah jika memang tidak membaca `selectedId`.
- Langkah:
  1. Hapus baris `selectedId: searchParams.get("selected") || undefined` dari objek `state`.
  2. Grep `useMapUrlState.ts` dan `MapViewport.tsx` plus seluruh `src/` untuk sisa `selectedId` / `get("selected")` / `selected=` URL.
  3. Jangan menyunting `src/lib/types.ts` (di luar wilayah). `MapUrlState.selectedId` tetap opsional dan tidak diisi — itu sisa tipe, bukan pembacaan/penulisan URL.
  4. Jangan menambah strip `params.delete("selected")` — itu justru membaca/menulis kunci yang dihapus.
- Cara membuktikan:
  - Grep: tidak ada `get("selected")` atau penulisan URL `selected` di hook dan viewport.
  - `MapViewport` tidak mendapat prop `selectedId`.
  - Tipe `MapUrlState` masih boleh punya field opsional; hook tidak mengisinya.
- Risiko:
  - Bookmark lama `?selected=` menjadi inert. Diterima: tidak ada tautan produk yang memakainya.
  - Field tipe tersisa di `types.ts`. Diterima: wilayah FE-2 tidak mengizinkan suntingan itu.

## Bacaan ulang niat

Keputusan hapus tertulis sebelum kode. Kriteria brief terpenuhi jika tidak ada sisa baca/tulis URL untuk kunci itu. Menyambungkan ditolak karena tidak ada tautan dan identitas fitur tidak diketahui tanpa tebakan. `MapViewport` disebut di brief agar diperiksa; mengubahnya hanya jika ada sisa pemakai. `types.ts` tidak disentuh.

## Perubahan

| Berkas | Ubah |
| --- | --- |
| `src/hooks/useMapUrlState.ts` | hapus `selectedId` dari objek state URL |
| `src/components/map/MapViewport.tsx` | tidak diubah — tidak pernah membaca `selectedId` |

## Bukti

Putaran 1.

Keputusan hapus sudah tertulis di Niat sebelum baris hook dihapus.

Grep `src/` setelah suntingan:
- `get("selected")` / `set("selected"` / `selectedId:` di hook: tidak ada.
- `MapViewport.tsx`: tidak ada `selected` / `selectedId`.
- Satu sisa `selectedId?: FeatureId` di `src/lib/types.ts` (field opsional, bukan baca/tulis URL; berkas di luar wilayah).
- Hit lain adalah `aria-selected` pada tab UI, bukan query string.

`MapWorkspace` tidak pernah meneruskan `selectedId` ke viewport; tidak perlu diubah.

## Bacaan ulang bukti versus kriteria

- [x] Keputusan (sambungkan atau hapus) tertulis di jurnal sebelum kode — hapus, di bagian Niat.
- [x] Jika dihapus: tidak ada sisa pembacaan/penulisan URL untuk kunci `selected` — hook tidak `get`/`set`/`delete` kunci itu; viewport tidak membacanya.
- [x] `selectedId` tidak terurai tanpa pemakai — parameter tidak lagi diurai.

## Keputusan

selesai
