# KOORD-ECC-C — skill, agent, brief wrapper

Agent: ecc
Gelombang: ECC-C
Status: selesai

## Niat

- Tujuan: Menulis wrapper C sesuai AN-ECC-1 tanpa menjalankan installer.
- Berkas: `.cursor/skills/aceh-ecc/SKILL.md`, `.cursor/skills/aceh-agent-ecc/SKILL.md`, `docs/pengembangan/05-ecc.md`, `.cursor/agents/aceh-ecc.md`, sunting tipis `00-protokol.md`, `STATUS.md`, `.cursor/skills/aceh-pengembangan-protokol/SKILL.md`, `.gitignore`.
- Langkah: tulis berkas baru; jangan sentuh `src/`; jangan `install.ps1`.
- Cara membuktikan: berkas ada; `disable-model-invocation` pada agent ECC; empat skill wilayah masih ada.
- Risiko: menimpa skill lama; dump katalog.

## Bacaan ulang niat

Hanya wrapper. Empat agent wilayah tidak diubah isinya. Protokol mendapat satu baris agent `ecc` dan dua baris gelombang ECC.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `.cursor/skills/aceh-ecc/SKILL.md` | baru |
| `.cursor/skills/aceh-agent-ecc/SKILL.md` | baru, `disable-model-invocation: true` |
| `docs/pengembangan/05-ecc.md` | baru |
| `.cursor/agents/aceh-ecc.md` | baru, merujuk skill |
| `docs/pengembangan/00-protokol.md` | baris agent `ecc` + gelombang ECC-C/A |
| `docs/pengembangan/STATUS.md` | Gelombang ECC-C |
| `.cursor/skills/aceh-pengembangan-protokol/SKILL.md` | brief `05-ecc.md` |
| `.gitignore` | `.ecc/`, `vendor/ecc/`, `ecc-install-state.json` |

## Bukti

Lihat `jurnal/AN-ECC-2.md`. Wrapper tertulis; installer tidak dijalankan.

## Bacaan ulang bukti versus kriteria

- [x] Skill aceh-ecc ada
- [x] Agent ECC disable-model-invocation
- [x] Empat skill wilayah tidak ditimpa
- [x] Tidak ada installer C

## Keputusan

selesai
