# AN-ECC-1 — naskah wrapper ECC (jalur C)

Agent: analis
Gelombang: ECC-C
Status: selesai — naskah terpakai ECC-C. Jangan ditulis ulang.

## Niat

- Tujuan: Mengunci kontrak harness ECC di Aceh Tangguh sebelum ada berkas skill/agent baru. ECC menjadi agent ke-5 (harness/koordinator), bukan pengganti data/backend/frontend/analis. Loop ECC dipetakan ke siklus tulis–baca ulang yang sudah ada.
- Berkas: jurnal ini; setelah naskah bisa dijalankan tanpa tebakan, KOORD-ECC-C menulis skill/brief (bukan tiket ini).
- Langkah: tulis keputusan tunggal per butir; baca ulang; jangan menjalankan installer ke `.cursor/` aplikasi; jangan mengubah `src/`.
- Cara membuktikan: setiap butir punya perilaku yang bisa dicek dari berkas (nama skill, `disable-model-invocation`, wilayah, larangan Memory Vault).
- Risiko: dump katalog ECC; menimpa `aceh-*`; Memory Vault jadi kebijakan; commit tanpa diminta; membuka DATA-4 / P2 Juklak / POST nasional.

## Bacaan ulang niat

Tulisan murni. Bukan opsi. Fase C = wrapper saja. Clone sibling `../ecc` (tag `v2.2.0`, npm `ecc-universal` 2.2.0, commit `5eddf1a3`) boleh dibaca, tidak disalin massal. Empat agent wilayah tetap `disable-model-invocation: true`. Kebijakan = jurnal + STATUS + brief, bukan `.ecc/memory/`.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `docs/pengembangan/jurnal/AN-ECC-1.md` | Naskah di bawah |
| `docs/pengembangan/STATUS.md` | Gelombang ECC-C + AN-ECC-1 (oleh KOORD setelah naskah) |

Tidak ada perubahan `src/` pada tiket ini.

## Naskah (kontrak KOORD-ECC-C / AN-ECC-2)

### 1. Peran

| Nama | Jenis | Tugas |
| --- | --- | --- |
| `aceh-ecc` | skill | Loop ECC → siklus jurnal. Dimuat jika pengguna menyebut ECC, harness, koordinator, atau plan-test-review. |
| `aceh-agent-ecc` | skill agent | Agent ke-5. `disable-model-invocation: true`. Harness/koordinator. |
| `ecc` | nama singkat di protokol | Sama dengan `aceh-agent-ecc`. |

ECC tidak mengganti data, backend, frontend, atau analis. Ia membuka tiket, mendelegasikan ke agent wilayah, membaca STATUS, menulis jurnal `KOORD-*` / `AN-ECC-*` / `KOORD-ECC-*`.

### 2. Peta loop

| ECC | Aceh Tangguh |
| --- | --- |
| plan | Niat di jurnal, lalu baca ulang niat |
| test | Uji/bukti yang disebut brief (sering `npm test` / `tsc`) sebelum atau bersama kerja |
| implement | Kerja hanya di berkas niat; lewat agent wilayah |
| review | Baca ulang bukti versus kriteria |
| verify | Butir penerimaan tertutup atau blocker |
| remember | Status jurnal + [STATUS.md](../STATUS.md). Bukan Memory Vault sebagai aturan |

### 3. Wilayah `aceh-agent-ecc`

Boleh: `docs/pengembangan/STATUS.md`, `docs/pengembangan/05-ecc.md`, `docs/pengembangan/00-protokol.md` (baris agent/gelombang saja), `docs/pengembangan/jurnal/KOORD-*.md`, `docs/pengembangan/jurnal/AN-ECC-*.md`, `docs/pengembangan/jurnal/KOORD-ECC-*.md`, `.cursor/skills/aceh-ecc/**`, `.cursor/skills/aceh-agent-ecc/**`, `.cursor/skills/aceh-pengembangan-protokol/SKILL.md` (sebut brief ke-5), `.cursor/agents/aceh-ecc.md` (opsional tipis), `.gitignore` (artefak ECC lokal).

Dilarang menyentuh kecuali tiket koordinator secara eksplisit dan hanya bacaan ulang (bukan kode fitur): `src/app/api/**`, `scripts/**`, `messages/**`, `src/components/**`, `supabase/migrations/` lama.

### 4. Empat agent lama

`aceh-agent-data`, `aceh-agent-backend`, `aceh-agent-frontend`, `aceh-agent-analis` tetap `disable-model-invocation: true`. Meminta "jalankan agent backend" tetap membuka `02-backend.md`, bukan katalog ECC.

### 5. Clone sibling — boleh dibaca di C, jangan disalin massal

Lokasi: `C:\Users\Patron\Documents\aceh tangguh vs\ecc` (relatif dari repo aplikasi: `../ecc`).

Pin: tag `v2.2.0`, `ecc-universal` 2.2.0, HEAD `5eddf1a3ffd311423be2d4ba7d26f7209c91b033`.

Boleh dibaca:

- `../ecc/skills/search-first/SKILL.md`
- `../ecc/skills/tdd-workflow/SKILL.md`
- `../ecc/skills/security-review/SKILL.md`
- `../ecc/README.md` (bagian Cursor / Platform Support)

Dilarang di C: `install.ps1` / `install.sh` ke `.cursor/` aplikasi; menyalin 286 skill atau 68 agent; mengeksekusi hook ECC; stack plugin Claude + installer + salinan manual.

### 6. Memory dan kebijakan

`.ecc/memory/` dan `~/.ecc/memory/` = konteks belum ditinjau, bukan kebijakan. Jangan menaruh naskah, zona KRB, kode Tatonas, atau angka korban di Memory Vault sebagai sumber kebenaran.

### 7. Yang tidak boleh (berlaku C dan A)

- Menimpa `.cursor/skills/aceh-pengembangan-protokol` atau `aceh-agent-{data,backend,frontend,analis}` kecuali sunting tipis yang disebut naskah.
- Menebak Tatonas / KRB / korban.
- Commit atau push kecuali diminta koordinator.
- DATA-4, P2 Juklak, POST nasional.
- Menulis nilai `OVERLAY_CRON_SECRET`.

### 8. Kriteria penerimaan C (AN-ECC-2)

- Lima skill Aceh yang sudah ada tetap ada; diff hanya berkas baru + sunting protokol/STATUS/protokol-skill yang direncanakan.
- Tidak ada `.cursor/agents/ecc-*.md`, `.cursor/hooks.json`, atau rules ECC di repo aplikasi setelah C.
- Skill `aceh-ecc` dan `aceh-agent-ecc` ada; agent ECC `disable-model-invocation: true`.
- Brief `05-ecc.md` ada; `00-protokol.md` memuat baris agent `ecc`.
- Tidak ada perubahan `src/` dari tiket C.

## Bacaan ulang bukti versus kriteria

- [x] Peran harness vs empat wilayah tertulis
- [x] Peta loop ECC → jurnal tertulis
- [x] Wilayah dan larangan C tertulis
- [x] Pin clone v2.2.0 tertulis
- [x] Memory bukan kebijakan tertulis

## Keputusan

siap-kode — KOORD-ECC-C boleh menulis skill/brief sesuai naskah ini.
