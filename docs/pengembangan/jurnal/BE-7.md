# BE-7 — rotasi kunci PII

Agent: backend
Gelombang: 3
Status: selesai

## Niat

- Tujuan: Ciphertext PII laporan membawa identitas kunci agar rotasi `LAPORAN_PII_KEY` tidak mematahkan baris lama. Enkripsi baru memakai AES-256-GCM dengan format `v2:<keyId>:<iv>:<data>:<tag>`. `v1:iv:data:tag` tetap terbaca.
- Nama env (dikunci di sini sebelum kode):
  - `LAPORAN_PII_KEY` — kunci tulis saat ini, 64 hex. Tidak berubah peran; setup lama tetap jalan.
  - `LAPORAN_PII_KEY_ID` — id kunci tulis. Kosong/tidak di-set → `k1`. Hanya `[A-Za-z0-9][A-Za-z0-9_-]{0,31}` (tanpa `:`).
  - `LAPORAN_PII_KEYS` — kunci cadangan untuk dekripsi, `id=hex64,id2=hex64`. Opsional. Entri rusak dilewati, tidak mematahkan tulis.
  - `LAPORAN_PII_SALT` — tidak diubah.
- Berkas:
  - `src/lib/laporan/crypto.ts` — `encryptPii` / `decryptPii` + ring kunci.
  - `src/lib/laporan/crypto.test.ts` — uji putaran v2 dua kunci; v1 + kunci primer; kunci salah gagal.
  - `docs/laporan-production.md` — sudah menyebut `LAPORAN_PII_KEY`; tambah `KEY_ID` / `KEYS` tanpa nilai secret.
  - `docs/vercel.md` — sama.
  - Tidak diubah: `src/lib/laporan/service.ts` (tetap memanggil `encryptPii`); rute admin/cron yang memanggil `decryptPii`; `SECURITY.md`; skrip generate/verify; `BE-8`.
- Langkah:
  1. Ring: primer = `LAPORAN_PII_KEY` + id `LAPORAN_PII_KEY_ID` (default `k1`). Cadangan dari `LAPORAN_PII_KEYS`. Id yang sama: primer menang.
  2. `encryptPii`: tanpa kunci primer → fallback hash (perilaku lama). Dengan kunci → `v2:<keyId>:...`. `KEY_ID` tidak valid → lempar (jangan menulis payload tak terurai).
  3. `decryptPii`:
     - `v2:` (5 bagian): coba kunci yang id-nya cocok; lalu primer; lalu cadangan. AES-GCM gagal = coba kunci berikutnya.
     - `v1:` (4 bagian): coba kunci primer dulu (kompatibilitas mundur). Jika gagal, coba cadangan agar rotasi primer tidak mematahkan baris `v1:` yang sudah tersimpan.
     - Bukan `v1:`/`v2:` atau tanpa kunci primer → galat seperti sekarang.
  4. `isProductionPiiConfigured` / `assertProductionPii` tetap hanya primer + salt; `KEY_ID`/`KEYS` tidak wajib.
- Cara membuktikan:
  - Uji: enkripsi baru `^v2:<id>:`; putaran k1→rotasi ke k2 dengan k1 di `KEYS` tetap terbuka; ciphertext baru k2 terbuka; payload `v1:` buatan dengan kunci primer terbuka tanpa `KEYS`; kunci yang tidak ada di ring gagal.
  - Kunci uji dibuat di proses tes (`01`/`02` berulang atau `randomBytes`); bukan secret produksi.
  - `npm test` lalu `npx tsc --noEmit` (PowerShell: `npm test; if ($LASTEXITCODE -eq 0) { npx tsc --noEmit }`).
- Risiko:
  - Tes yang mengubah `process.env` bisa bersaing antar berkas; pulihkan env di `afterEach` seperti `writer.test.ts`.
  - Fallback hash dev tidak jadi `v2`; dekripsi hash tetap ditolak.
  - Tidak ada job tulis-ulang baris `v1:` → `v2:` di tiket ini.

## Bacaan ulang niat

Nama env terkunci: `LAPORAN_PII_KEY` (tulis), `LAPORAN_PII_KEY_ID` (default `k1`), `LAPORAN_PII_KEYS` (`id=hex64,...`). Setup yang hanya punya `LAPORAN_PII_KEY` tetap menulis (kini `v2:k1:`) dan tetap membaca `v1:` dengan kunci yang sama. `service.ts` tidak perlu diubah. Kriteria brief: ciphertext baru ber-id; `v1` tidak patah; dua kunci v2; kunci salah gagal; tes + tsc. Cadangan untuk `v1:` tercatat agar “rotasi tidak mematahkan v1” berlaku setelah primer diganti, bukan hanya saat id ditambah. Tidak menebak data resmi. Siap kode.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `src/lib/laporan/crypto.ts` | Tulis `v2:<keyId>:...`; dekripsi v2 (id → primer → cadangan) dan v1 (primer → cadangan) |
| `src/lib/laporan/crypto.test.ts` | Putaran dua kunci; v1 + primer; v1 setelah rotasi via `KEYS`; kunci salah gagal |
| `docs/laporan-production.md` | Tabel env `KEY_ID` / `KEYS`; langkah rotasi tanpa secret |
| `docs/vercel.md` | Baris env opsional yang sama |

## Bukti

Putaran 1: `npm test` 260 lulus; `npx tsc --noEmit` gagal (`TS2802` iterasi `Map.values()`, butuh `downlevelIteration`). Putaran 2: `Array.from(backups.values())`.

```
node --import tsx --test src/lib/laporan/crypto.test.ts
# tests 8, pass 8

npm test; if ($LASTEXITCODE -eq 0) { npx tsc --noEmit }
# tests 260, pass 260, fail 0
# tsc --noEmit exit 0
```

Ciphertext baru `^v2:k1:` / `^v2:k2:`. `v1:` terbuka dengan primer tanpa `KEYS`. Setelah primer diganti, `v1:` terbuka lewat `LAPORAN_PII_KEYS`. Kunci di luar ring melempar. Kunci uji `01`/`02`/`03` berulang 32, bukan secret produksi.

## Bacaan ulang bukti versus kriteria

- [x] Enkripsi baru `v2:<keyId>:<iv>:<data>:<tag>` (AES-256-GCM)
- [x] `decryptPii`: id cocok, lalu cadangan; `v1:` tetap dengan primer (lalu cadangan agar rotasi tidak mematahkan)
- [x] Env: `LAPORAN_PII_KEY` kunci tulis; `LAPORAN_PII_KEY_ID` default `k1`; `LAPORAN_PII_KEYS` `id=hex64,...`
- [x] Setup lama tanpa `KEY_ID`/`KEYS` tidak pecah
- [x] Uji dua kunci v2; v1 + primer; kunci salah gagal
- [x] `npm test` + `tsc --noEmit` lulus
- [x] Tidak ada secret nyata; dokumen yang sudah menyebut `LAPORAN_PII_KEY` diisi
- [x] BE-8 tidak dikerjakan; `service.ts` tidak diubah

## Keputusan

selesai
