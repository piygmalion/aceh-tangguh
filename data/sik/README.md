# SIK Aceh master (local only)

Put the BPBA/SIK SQLite dump here:

```
data/sik/sik_aceh.db
```

The file is gitignored. Do not commit it.

Inspect + dry-run merge (no fixture writes):

```
python3 scripts/import-sik-aceh.py
python3 scripts/import-sik-aceh.py --db data/sik/sik_aceh.db
```

Write fixtures only after the conflict report has **zero GPS quarantines**:

```
python3 scripts/import-sik-aceh.py --write-fixtures
```

Supabase upsert is a separate dry-run by default — see `scripts/seed-sik-supabase.mjs`.

Supported table/column aliases: [`scripts/sik/SCHEMA.md`](../../scripts/sik/SCHEMA.md).
