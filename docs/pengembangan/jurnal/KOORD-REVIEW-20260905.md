# KOORD-REVIEW — tinjauan pasca-G13

Agent: koordinator
Gelombang: review 5 September 2026
Status: selesai

## Niat

Membaca ulang kode pengembangan G0–G13 (data, backend, analis; permukaan publik ikut). Keluaran: dataflow, system flow, rekomendasi. Perbaiki hanya drift dokumen dan sisa i18n yang sudah terbukti. Jangan DATA-4. Jangan mengarang secret. Jangan membuka P2 Juklak.

## Bacaan ulang niat

Review lalu rapikan kontrak yang salah. Bukan gelombang fitur baru. Bukan Tatonas.

## Perubahan

| Berkas | Isi |
| --- | --- |
| kanvas `tinjauan-pasca-g13` | dataflow, alur, rekomendasi |
| `security/attack-surface.md` | guardPublicPost + requireModuleApi moderasi |
| `.env.example` | hapus klaim hazards/reports hidup |
| `api/admin/laporan/route.ts` | komentar moderasi |
| `PelatihanPublic` / `NomorPentingList` / `MitraPublic` | kunci `publik` |
| uji AN-9 + AN-17 | kunci inventaris dan sisa i18n |

## Bukti

```
Kanvas tinjauan-pasca-g13: 60 rute, 34 migrasi, overlay GET baca ledger
Tindak lanjut reviewer: admin/reports = moderasi; resource q = sanitizeSearch; panduan di inventaris
DATA-10 berkas 20260921 siap; apply remote kemudian selesai (lihat DATA-10 + STATUS tindak lanjut 5 September). Kalimat “menunggu persetujuan” di naskah awal review ini sudah dusta.
purge_expired di produksi sudah service_role (bukan temuan baru)
npm test setelah tindak lanjut

localhost:3130/en/training — Training schedule, Propose a training, Submit
localhost:3130/id/pelatihan — Jadwal pelatihan, Ajukan pelatihan, Kirim
localhost:3130/en/partners — Disability aggregates (no identities)
```

## Bacaan ulang bukti versus kriteria

- [x] Dataflow tertulis
- [x] System flow tertulis
- [x] Rekomendasi terurut; tertahan tidak dikode
- [x] Perbaikan aman diterapkan

## Keputusan

selesai
