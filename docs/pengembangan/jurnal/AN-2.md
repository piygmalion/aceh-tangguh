# AN-2 — CI Node 22

Agent: analis
Gelombang: 1
Status: selesai

## Niat

- Tujuan: Runner CI memakai Node 22, sama dengan `package.json` `engines.node` (`22.x`), supaya uji dan typecheck tidak berjalan di major yang berbeda dari yang dinyatakan proyek.
- Berkas:
  - `.github/workflows/ci.yml` — hanya nilai `node-version`
  - Tidak mengubah `package.json`, skrip uji, atau berkas aplikasi
- Langkah:
  1. Baca `engines.node` di `package.json` (harus `22.x`).
  2. Ubah `actions/setup-node` `node-version` dari `"20"` menjadi `"22"` (nilai yang diminta brief; setup-node 22 = baris 22.x).
  3. Jangan mengubah langkah lint/typecheck/test, cache, atau pemicu workflow.
- Cara membuktikan:
  - `ci.yml` memuat `node-version: "22"` dan tidak memuat `node-version: "20"`.
  - `package.json` `engines.node` tetap `22.x`.
  - Diff workflow hanya baris versi Node.
- Risiko:
  - Menyentuh langkah lain di CI — dihindari.
  - Memakai `22.x` di YAML padahal brief menulis `22` — brief diikuti; keduanya major 22.

## Bacaan ulang niat

Satu berkas, satu nilai. Tidak ada tebakan data resmi. `"22"` di setup-node selaras `engines` `22.x`. Tidak mengubah perilaku aplikasi.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `.github/workflows/ci.yml` | `node-version: "20"` → `"22"` |

## Bukti

Putaran 1.

```
package.json engines.node = 22.x
.github/workflows/ci.yml:
          node-version: "22"
# tidak ada node-version: "20"
# langkah lint / typecheck / test tidak berubah
```

## Bacaan ulang bukti versus kriteria

- [x] `node-version` menjadi `22`
- [x] Selaras `package.json` `engines.node` (`22.x`) — major 22

## Keputusan

selesai
