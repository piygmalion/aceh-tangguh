# KOORD-ECC-A — dry-run lalu install selektif

Agent: ecc
Gelombang: ECC-A
Status: selesai

## Niat

- Tujuan: Menjalankan AN-ECC-3: dry-run, tolak overwrite, tulis allowlist, doctor.
- Berkas: tiga skill ECC + empat rules TypeScript di `.cursor/`; jurnal ini.
- Langkah: dry-run JSON → tolak §2 → salin allowlist dari clone pin → doctor.
- Cara membuktikan: log dry-run, daftar berkas, doctor tanpa install-state, skill aceh-* utuh.
- Risiko: installer menarik hooks/MCP lewat dependensi `workflow-quality`.

## Bacaan ulang niat

Cwd = repo Aceh Tangguh. Perintah profil ditolak naskah. Tulis = salinan allowlist, bukan `install.ps1` penuh.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `.cursor/skills/tdd-workflow/SKILL.md` | salinan ECC v2.2.0 + banner Aceh |
| `.cursor/skills/search-first/SKILL.md` | salinan ECC v2.2.0 + banner Aceh |
| `.cursor/skills/security-review/SKILL.md` | salinan ECC v2.2.0 + banner Aceh |
| `.cursor/skills/security-review/cloud-infrastructure-security.md` | salinan ECC |
| `.cursor/rules/typescript-coding-style.mdc` | ECC TS, `alwaysApply: false` |
| `.cursor/rules/typescript-testing.mdc` | ECC TS, `alwaysApply: false` |
| `.cursor/rules/typescript-patterns.mdc` | ECC TS, `alwaysApply: false` |
| `.cursor/rules/typescript-security.mdc` | ECC TS, `alwaysApply: false` |
| `.cursor/skills/aceh-ecc/SKILL.md` | tautan skill A |
| `jurnal/AN-ECC-3.md` | addendum tolak installer |

Tidak disalin: hooks, `mcp.json`, `agents/ecc-*`, rules `common-*` / golang / python, `typescript/hooks.md`.

## Bukti

```
npm view ecc-universal version → 2.2.0
clone ../ecc tag v2.2.0 HEAD 5eddf1a3

dry-run --profile minimal --without baseline:platform
  → gagal: skill-unified-memory depends on platform-configs

dry-run --modules rules-core --with lang:typescript --skills tdd-workflow,security-review,search-first
  → ditolak AN-ECC-3 §2: hooks.json, mcp.json, rules non-TS, skill di luar allowlist

salinan allowlist dari ../ecc (v2.2.0)
  skills: tdd-workflow, search-first, security-review
  rules: typescript-{coding-style,testing,patterns,security}.mdc alwaysApply false

node ../ecc/scripts/ecc.js doctor --target cursor
  → No ECC install-state files found
  (disengaja: installer tidak diterapkan)

.cursor/hooks.json: tidak ada
.cursor/mcp.json: tidak ada
.cursor/agents/: aceh-ecc.md saja
aceh-agent-{data,backend,frontend,analis}: tidak diubah
```

## Bacaan ulang bukti versus kriteria

- [x] Dry-run disimpan (ditolak §2)
- [x] Tidak menimpa aceh-*
- [x] Hooks/MCP tidak masuk
- [x] Doctor dijalankan (tanpa state installer)

## Keputusan

selesai
