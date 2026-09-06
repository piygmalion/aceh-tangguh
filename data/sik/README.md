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

Write fixtures only after the conflict report has **zero GPS quarantines**, or with an explicit accept that **keeps existing GPS**:

```
python3 scripts/import-sik-aceh.py --write-fixtures
python3 scripts/import-sik-aceh.py --write-fixtures --accept-gps-quarantine
```

`--accept-gps-quarantine` does not overwrite decimal GPS that disagree by more than 100 m. Without the flag, GPS quarantines still block `--write-fixtures`. Attribute conflicts are recorded and do not block the write.

Supabase upsert is a separate dry-run by default — see `scripts/seed-sik-supabase.mjs`.

Supported table/column aliases: [`scripts/sik/SCHEMA.md`](../../scripts/sik/SCHEMA.md).
