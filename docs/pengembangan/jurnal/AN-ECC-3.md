# AN-ECC-3 — naskah allowlist install ECC-A

Agent: analis
Gelombang: ECC-A
Status: selesai — naskah terpakai ECC-A. Jangan ditulis ulang.

## Niat

- Tujuan: Mengunci perintah install selektif ke `.cursor/` repo Aceh Tangguh tanpa menimpa `aceh-*`, tanpa hooks, tanpa merge MCP.
- Berkas: jurnal ini. KOORD-ECC-A yang menjalankan perintah.
- Langkah: tulis perintah dan aturan tolak; jangan install di tiket ini.
- Cara membuktikan: setiap flag punya alasan; dry-run wajib sebelum tulis.
- Risiko: `--profile minimal --target cursor typescript` gagal (argumen legacy `typescript` tidak boleh digabung `--profile`); `platform-configs` menggabungkan `mcp.json`; `agents-core` menyalin puluhan agent.

## Bacaan ulang niat

Cwd install = repo aplikasi. Skrip = sibling `../ecc/install.ps1`. Pin tetap `v2.2.0`. Profil `minimal` tidak memuat `hooks-runtime`. Bahasa TypeScript lewat `--with lang:typescript`.

## Perubahan

Hanya jurnal + STATUS (baris A). Tidak ada `src/`.

## Naskah (kontrak KOORD-ECC-A / AN-ECC-4)

### 1. Perintah dry-run pertama

Dari `aceh-tangguh` (bukan dari folder ECC):

```powershell
& "..\ecc\install.ps1" --profile minimal --target cursor --with lang:typescript --skills tdd-workflow,security-review,search-first --without baseline:platform --dry-run --json
```

`--without baseline:platform` menolak `mcp-configs` / salinan `.cursor` ECC (hooks adapter, merge MCP).

Jangan: `--profile full`, `--enable-hooks`, argumen positional `typescript`, stack plugin Claude.

### 2. Aturan tolak (wajib abort)

- Tujuan menimpa `.cursor/skills/aceh-*` atau `.cursor/agents/aceh-ecc.md`
- Tujuan `.cursor/hooks.json` atau modul `hooks-runtime`
- Merge `.cursor/mcp.json`
- Menyalin skill di luar allowlist + yang sudah ada `aceh-*` jika jumlah skill ECC baru > 25 (context membengkak). Ulangi dry-run dengan `--without baseline:workflow` dan tetap `--skills tdd-workflow,security-review,search-first`.
- Agent baru > 15 berkas: ulang dengan `--without baseline:agents` (biarkan `.cursor/agents/aceh-ecc.md` saja) kecuali semua tujuan `ecc-*` dan koordinator menyetujui daftar di jurnal.

### 3. Allowlist skill

Hanya ketiga ini yang diminta eksplisit: `tdd-workflow`, `security-review`, `search-first`. Skill lain dari `workflow-quality` boleh masuk hanya jika lolos ambang §2.

### 4. Setelah dry-run lolos

Install perintah yang sama tanpa `--dry-run`. Lalu dari sibling ECC, dengan cwd aplikasi jika dokter memakai `process.cwd()`:

```powershell
node "..\ecc\scripts\ecc.js" doctor --target cursor
```

Catat `ecc-install-state.json` (di-gitignore). Jangan commit kecuali diminta.

### 5. Kriteria AN-ECC-4

- Skill `aceh-*` utuh
- Hooks tidak aktif
- Tidak ada merge MCP
- Berkas baru tercatat di `KOORD-ECC-A`
- Agent wilayah tetap ke brief lama
- `src/` tidak tersentuh; jika tersentuh, `npm test` dan `tsc` hijau

## Bacaan ulang bukti versus kriteria

- [x] Perintah Windows + cwd tertulis
- [x] Tanpa hooks / tanpa MCP tertulis
- [x] Ambang potong agents/skills tertulis
- [x] Pin v2.2.0 tetap

## Addendum setelah dry-run

`--profile minimal --without baseline:platform` gagal: `skill-unified-memory` bergantung `platform-configs`.

`--modules rules-core --with lang:typescript --skills tdd-workflow,security-review,search-first` lolos parser tetapi **ditolak §2**: tujuan memuat `.cursor/hooks.json`, merge `mcp.json`, rules golang/python/swift, dan skill di luar allowlist (`article-writing`, `content-engine`, …). `tdd-workflow` menarik `workflow-quality` → `skill-unified-memory` → `platform-configs`.

**Perintah tulis yang disetujui:** jangan jalankan installer ke `.cursor/`. Salin dari clone pin `v2.2.0` hanya:

- `../ecc/skills/tdd-workflow/` → `.cursor/skills/tdd-workflow/`
- `../ecc/skills/security-review/` → `.cursor/skills/security-review/`
- `../ecc/skills/search-first/` → `.cursor/skills/search-first/`
- `../ecc/rules/typescript/{coding-style,testing,patterns,security}.md` → `.cursor/rules/typescript-*.mdc` dengan `alwaysApply: false` (bukan `hooks.md`).

Jangan salin agent ECC, commands, hooks, `mcp.json`, atau rules `common-*`.

## Keputusan

siap-kode — tulis lewat salinan allowlist, bukan `install.ps1` penuh.
