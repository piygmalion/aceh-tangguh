# Strix Cloud — Aceh Tangguh

Mesin pentest: **[Strix Cloud](https://app.strix.ai)** (tanpa Docker, tanpa kunci LLM lokal). CLI `strix cloud` hanya mengendalikan platform.

Instruksi agen: [`security/strix-instructions.md`](../../security/strix-instructions.md). Inventaris API: [`security/attack-surface.md`](../../security/attack-surface.md).

## Larangan

- Jangan scan **produksi** (`https://aceh-tangguh.vercel.app`) untuk uji hidup/tulis.
- Preview Vercel yang masih memakai proyek Supabase `whojoxrbcdyotrpolgav` **bukan** staging. Live test hanya ke host yang `NEXT_PUBLIC_SUPABASE_URL`-nya **berbeda**.
- Jangan unggah `.env*`, `SUPABASE_SERVICE_ROLE_KEY`, atau `LAPORAN_PII_*` ke sandbox.
- Jangan commit `strix_runs/`, PoC, atau payload ke git. Temuan tetap di dashboard Strix.

## Instal CLI (Windows)

PowerShell (pipx; jika pipx gagal membuat venv di Python Store, pakai `pip install --user`):

```powershell
python -m pip install --user pipx
python -m pipx ensurepath
pipx install strix-agent
# cadangan:
python -m pip install --user strix-agent
```

Jika `strix` tidak ada di PATH setelah `pip install --user`, panggil `strix.exe` dari folder Scripts Python pengguna (Python Store: `%LocalAppData%\Packages\PythonSoftwareFoundation.Python.3.13_*\LocalCache\local-packages\Python313\Scripts`).

Atau Git Bash / WSL:

```bash
curl -sSL https://strix.ai/install | bash
```

## Login dan kredit

```bash
strix cloud login --no-browser --scope-profile recommended
strix cloud whoami
strix cloud credits
```

`--scopes` tidak bisa digabung dengan `--scope-profile`. Instal GitHub App lewat CLI butuh `--scope-profile full` (scope `integrations:write`); kalau tidak, pasang dari dashboard.

Code review sumber saja biasanya mulai ~60 kredit (non-Enterprise). Wallet 0 kredit → peluncuran ditolak (`scan_credit_limit_reached`). Isi di [settings/billing](https://app.strix.ai/settings/billing) atau `strix cloud billing topup --credits 60` (perlu pembayaran Anda). Trial paket Cloud (`strix cloud billing subscribe --plan strix_cloud`) mencakup review PR, **terpisah** dari kredit scan.

## GitHub App (review PR)

Ini jalur CI untuk pull request — **tanpa** workflow tambahan, supaya tidak dobel biaya.

1. Di dashboard Strix, **Integrations → GitHub**, atau `strix cloud login --scope-profile full` lalu `strix cloud integrations install github --no-browser` (pasang pada `piygmalion/aceh-tangguh`).
2. Di dashboard Strix, aktifkan PR reviews untuk repo itu.
3. PR non-draft mendapat komentar temuan. Mention `@strix` atau `@strix-security` untuk menjalankan ulang.
4. Jangan menambah job `pull_request` yang memanggil `strix cloud scans start` — itu menduplikasi App.

Token opsional untuk memicu review dari API: secret `STRIX_API_TOKEN` dengan scope `pr_reviews:write`. `installation_id` dari `strix cloud repos list`.

## Code review (white-box)

Dari akar repo, setelah `.strixignore` ada:

```bash
strix cloud scans start --source . --dry-run --show-files --json
```

Periksa `source.archive_sha256` dan daftar file. Pastikan `.env`, `.env.production`, `public/tiles/`, dan GeoJSON besar **tidak** ikut.

```bash
SOURCE_SHA256="<sha256 dari dry-run>"
strix cloud scans start --source . --approve-sha256 "$SOURCE_SHA256" --wait
```

`--yes` hanya untuk CI (`workflow_dispatch`); secara lokal pakai digest dua langkah di atas.

## Live test (grey-box, staging saja)

1. `strix cloud domains add --domain <staging-host> --asset-type web_app`
2. Verifikasi kepemilikan (`strix cloud domains verify <domain-id>`).
3. Daftarkan test users di Cloud (email/password staf **staging**) dengan `login_url` `https://<staging-host>/id/admin/login`. Jangan simpan password di git.
4. Jalankan `live_test` terhadap domain itu. Source + domain dalam satu perintah diinferensi sebagai `live_test`.
5. Tempel aturan dari `security/strix-instructions.md` sebagai instruksi/knowledge scan.

Tanpa host staging terisolasi: **hanya** `code_review`.

## Workflow manual di GitHub

[`.github/workflows/strix.yml`](../../.github/workflows/strix.yml) memakai `workflow_dispatch` saja. Set repository secret **`STRIX_API_TOKEN`** (Settings → API Access di Strix) dengan `scans:write` dan `uploads:write`.

Jadwal berulang native Strix (`strix cloud` schedules) butuh paket **Pro**.

## Setelah scan

```bash
strix cloud vulns list --severity critical
strix cloud vulns list
```

Ringkas temuan di issue/PR sebagai perbaikan defensif (authz, RLS, allowlist kolom). Jangan tempel PoC ke repo.

Perbaikan kode: minta secara terpisah, satu temuan (atau satu kelompok) per perubahan.
