# Brief agent ECC (harness)

Anda mengurus loop harness, delegasi ke empat agent wilayah, dan instalasi ECC yang selektif. Baca [00-protokol.md](00-protokol.md) lalu kerjakan tiket sesuai [STATUS.md](STATUS.md). Kontrak C: [jurnal/AN-ECC-1.md](jurnal/AN-ECC-1.md).

Anda tidak mengganti data, backend, frontend, atau analis. Anda tidak mengarang kode Tatonas, zona KRB, atau angka korban. Memory ECC bukan kebijakan.

## Clone referensi

Sibling: `C:\Users\Patron\Documents\aceh tangguh vs\ecc` (dari repo aplikasi: `../ecc`). Pin: tag `v2.2.0`, `ecc-universal` 2.2.0, commit `5eddf1a3`. Jangan ikuti `main` mengambang.

## Tiket gelombang ECC-C — wrapper

### AN-ECC-1 — naskah penerimaan wrapper

Jurnal: `jurnal/AN-ECC-1.md`. Selesai sebagai naskah. Jangan ditulis ulang kecuali kontrak berubah.

### KOORD-ECC-C — skill, agent, brief

Jurnal: `jurnal/KOORD-ECC-C.md`.

**Berkas.** `.cursor/skills/aceh-ecc/SKILL.md`, `.cursor/skills/aceh-agent-ecc/SKILL.md`, `docs/pengembangan/05-ecc.md`, `.cursor/agents/aceh-ecc.md` (opsional), sunting tipis `00-protokol.md`, `STATUS.md`, `.cursor/skills/aceh-pengembangan-protokol/SKILL.md`, `.gitignore` artefak ECC lokal.

**Kriteria.**

- Skill `aceh-ecc` memuat WHAT/WHEN, peta loop, delegasi, larangan.
- `aceh-agent-ecc` punya `disable-model-invocation: true`.
- Empat skill agent wilayah tidak ditimpa.
- Tidak ada installer ke `.cursor/` aplikasi pada tiket ini.

### AN-ECC-2 — uji wrapper

Jurnal: `jurnal/AN-ECC-2.md`.

**Kriteria.** Lima skill Aceh lama ada. Tidak ada `.cursor/agents/ecc-*.md`, `.cursor/hooks.json`, atau rules ECC. Meminta agent backend tetap ke `02-backend.md`. Meminta ECC/harness ke `aceh-ecc` + `05-ecc.md`. Tidak ada perubahan `src/` dari C.

## Tiket gelombang ECC-A — install selektif

Jangan mulai sebelum AN-ECC-2 `selesai`.

### AN-ECC-3 — naskah allowlist

Jurnal: `jurnal/AN-ECC-3.md`.

Allowlist awal (sesuaikan nama setelah `consult` / dry-run):

- Profil `minimal` (tanpa `hooks-runtime`).
- Target `cursor`.
- Bahasa lewat `--with lang:typescript` (jangan gabungkan argumen legacy `typescript` dengan `--profile`).
- Skill: `tdd-workflow`, `security-review`, `search-first`.
- Jangan `--profile full`. Jangan `--enable-hooks`. Jangan merge MCP tanpa naskah.

### KOORD-ECC-A — dry-run lalu tulis

Jurnal: `jurnal/KOORD-ECC-A.md`.

Dari cwd repo Aceh Tangguh, dry-run `install.ps1` di sibling. Tolak tujuan yang menimpa `aceh-*`, hooks, atau MCP. Jika dependensi modul menarik dump, **jangan tulis lewat installer**: salin allowlist dari clone pin (tiga skill + rules TypeScript, `alwaysApply: false`). `ecc.js doctor --target cursor` boleh melaporkan tidak ada install-state.

### AN-ECC-4 — verifikasi A

Jurnal: `jurnal/AN-ECC-4.md`.

**Kriteria.** Skill `aceh-*` utuh. Berkas ECC terkelola tercatat di jurnal. Hooks tidak aktif. Agent wilayah tetap tertutup wilayah. Jika `src/` tersentuh, `npm test` dan `tsc` wajib hijau.

## Tiket gelombang ECC-S — skema kerapian

### AN-ECC-5 — naskah skema

Jurnal: `jurnal/AN-ECC-5.md`. Tulisan. Berkas: [06-skema-kerapian.md](06-skema-kerapian.md). Jangan mengubah `src/` kecuali brief S1 sudah dibuka di STATUS. Jangan DATA-4.

## Tiket gelombang ECC-CACHE — konsep caching

### AN-ECC-6 — naskah empat lapisan

Jurnal: `jurnal/AN-ECC-6.md`. Tulisan. Berkas: [07-konsep-caching.md](07-konsep-caching.md). Jangan mengubah `src/` pada tiket ini. Jangan Upstash sebagai store overlay. Jangan DATA-4. C1 = [AN-51](jurnal/AN-51.md); jangan dikode BE-37 sebelum AN-51 `siap-kode`. Jangan memakai AN-47 untuk C1. Jangan menimpa G36.

## Yang ditunda

Hook runtime, Memory Vault sebagai sumber kebenaran, ECC Pro / GitHub App. DATA-4 dan P2 Juklak tetap tertahan.
