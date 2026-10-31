# Atribusi skill yang disalin

Empat skill di direktori ini disalin dari [obra/superpowers](https://github.com/obra/superpowers), lisensi MIT, hak cipta Jesse Vincent (2025).

| | |
| --- | --- |
| URL repositori | https://github.com/obra/superpowers |
| Commit yang disalin | [`2ce8aa15d05bd57213e6f746f953aafb7ded7a8b`](https://github.com/obra/superpowers/commit/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b) |
| Pesan commit | Release v7.0.1: brainstorming retune, skills that better survive compaction, contribution templates (#2581) |
| Tanggal commit | 21 Oktober 2026 |
| Lisensi | [`LICENSE`](LICENSE) di direktori ini, byte-identik dengan `LICENSE` pada commit tersebut |
| Pohon sumber | https://github.com/obra/superpowers/tree/2ce8aa15d05bd57213e6f746f953aafb7ded7a8b/skills |

Teks skill sebagian besar tetap bahasa Inggris supaya salinan bisa diaudit terhadap commit di atas. Keluaran agen ke pemilik mengikuti bagian Metodologi di `AGENTS.md`: Bahasa Indonesia.

## Berkas yang disalin

| Sumber pada commit di atas | Salinan lokal |
| --- | --- |
| `skills/systematic-debugging/SKILL.md` | `systematic-debugging/SKILL.md` |
| `skills/systematic-debugging/root-cause-tracing.md` | `systematic-debugging/root-cause-tracing.md` |
| `skills/systematic-debugging/defense-in-depth.md` | `systematic-debugging/defense-in-depth.md` |
| `skills/systematic-debugging/condition-based-waiting.md` | `systematic-debugging/condition-based-waiting.md` |
| `skills/systematic-debugging/condition-based-waiting-example.ts` | `systematic-debugging/condition-based-waiting-example.ts.txt` |
| `skills/systematic-debugging/find-polluter.sh` | `systematic-debugging/find-polluter.sh` |
| `skills/verification-before-completion/SKILL.md` | `verification-before-completion/SKILL.md` |
| `skills/writing-plans/SKILL.md` | `writing-plans/SKILL.md` |
| `skills/requesting-code-review/SKILL.md` | `requesting-code-review/SKILL.md` |
| `skills/requesting-code-review/code-reviewer.md` | `requesting-code-review/code-reviewer.md` |
| `LICENSE` | `LICENSE` |

## Yang sengaja tidak disalin

- `using-superpowers`, `using-git-worktrees`, dan `brainstorming`, beserta seluruh skill upstream lain.
- Opsi merge mandiri di `finishing-a-development-branch` (skill itu tidak disalin). Rujukan dari `writing-plans` ke `subagent-driven-development` dan `executing-plans` dihapus karena kedua skill itu mengakhiri kerja dengan `finishing-a-development-branch`.
- `systematic-debugging/CREATION-LOG.md` — catatan penulis skill, bukan prosedur debug.
- `systematic-debugging/test-academic.md` serta `test-pressure-1.md`, `test-pressure-2.md`, dan `test-pressure-3.md` — skenario evaluasi skill. `test-pressure-1.md` menyuruh pembaca menganggap skenario sebagai insiden nyata dan mencantumkan opsi deploy. Berkas itu tidak masuk agar agen tidak menjalankannya.

## Suntingan lokal

- Setiap `SKILL.md` mendapat blok overlay SIK Aceh: Bahasa Indonesia untuk keluaran, `AGENTS.md` menang jika bentrok, larangan merge, deploy, dan push ke `main`.
- `systematic-debugging`: pemicu dibatasi ke bug peta, cache, Vercel, dan data. Rujukan `superpowers:test-driven-development` diganti ke `.cursor/skills/tdd-workflow/SKILL.md` dan `docs/pengembangan/00-protokol.md`. Rujukan verifikasi mengarah ke salinan lokal.
- `condition-based-waiting-example.ts` disimpan sebagai `.ts.txt` karena `tsconfig.json` meng-include `**/*.ts`. Cuplikan mengimpor `~/threads/...` yang tidak ada di repo ini.
- `find-polluter.sh` menjalankan satu berkas dengan `node --import tsx --test`, sama dengan runner `npm test`, karena skrip `test` di `package.json` tidak mengisolasi argumen berkas.
- `writing-plans`: rencana disimpan di `docs/pengembangan/rencana/`. Kerja tetap di cabang fitur. Tidak ada langkah worktree, merge, deploy, atau push ke `main`. Contoh `pytest` tetap sebagai bentuk templat upstream; overlay menyuruh memakai perintah di `AGENTS.md`.
- `requesting-code-review`: penilaian reviewer bukan GO integrasi. Templat tidak lagi bertanya "Ready to merge?". Review hanya-baca memakai `git show` dan `git diff`, tanpa `git worktree`. `git merge-base` tetap, sebagai cara menghitung batas diff, bukan perintah merge.

## Letak

`.cursor/rules/` tidak dipakai karena aturan di sana pendek, berformat `.mdc`, dan terikat `alwaysApply` atau `globs` (konteks PR #137). Empat skill ini prosedur panjang plus berkas pendamping. `.cursor/skills/` tidak dipakai agar deskripsi upstream tidak memicu debugging untuk setiap suntingan. Bagian Metodologi di `AGENTS.md` yang menentukan kapan masing-masing skill wajib dibaca.
