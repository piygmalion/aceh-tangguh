/**
 * Production: `next build` (Node server + API routes).
 * Static preview: STATIC_EXPORT=1 or GITHUB_PAGES=1 parks API/middleware/admin
 * SSR (incompatible with `output: "export"`), then writes `out/`.
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isStatic =
  process.env.STATIC_EXPORT === "1" || process.env.GITHUB_PAGES === "1";

function runNextBuild(env = process.env) {
  const bin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  const result = existsSync(bin)
    ? spawnSync(process.execPath, [bin, "build"], {
        cwd: root,
        stdio: "inherit",
        env,
      })
    : spawnSync("npx", ["next", "build"], {
        cwd: root,
        stdio: "inherit",
        env,
        shell: true,
      });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!isStatic) {
  runNextBuild();
  process.exit(0);
}

const pagesBase =
  process.env.NEXT_PUBLIC_BASE_PATH ||
  process.env.PAGES_BASE_PATH ||
  "/aceh-tangguh";

const env = {
  ...process.env,
  STATIC_EXPORT: "1",
  GITHUB_PAGES: process.env.GITHUB_PAGES || "1",
  NEXT_PUBLIC_STATIC_EXPORT: "1",
  NEXT_PUBLIC_GITHUB_PAGES: "1",
  NEXT_PUBLIC_BASE_PATH: pagesBase,
};

// Same filesystem as the repo — rename() cannot cross mount points (/tmp).
const parkRoot = path.join(root, ".static-export-park");
rmSync(parkRoot, { recursive: true, force: true });
mkdirSync(parkRoot, { recursive: true });
const parked = [];

function park(srcRel, destName) {
  const src = path.join(root, srcRel);
  if (!existsSync(src)) return;
  const dest = path.join(parkRoot, destName);
  cpSync(src, dest, { recursive: true });
  rmSync(src, { recursive: true, force: true });
  parked.push({ src, dest });
}

function restore() {
  for (const { src, dest } of [...parked].reverse()) {
    if (existsSync(src)) {
      rmSync(src, { recursive: true, force: true });
    }
    if (existsSync(dest)) {
      cpSync(dest, src, { recursive: true });
    }
  }
  parked.length = 0;
}

const stubAdmin = `import { setRequestLocale } from "next-intl/server";
import { StaticPreviewNotice } from "@/components/preview/StaticPreviewNotice";

export default async function StaticAdminStub({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  return <StaticPreviewNotice kind="admin" />;
}
`;

let wroteStubs = false;

try {
  park("src/app/api", "api");
  park("src/middleware.ts", "middleware.ts");
  park(path.join("src", "app", "[locale]", "admin"), "admin");

  const adminDir = path.join(root, "src", "app", "[locale]", "admin");
  mkdirSync(path.join(adminDir, "login"), { recursive: true });
  mkdirSync(path.join(adminDir, "denied"), { recursive: true });
  writeFileSync(path.join(adminDir, "page.tsx"), stubAdmin);
  writeFileSync(path.join(adminDir, "login", "page.tsx"), stubAdmin);
  writeFileSync(path.join(adminDir, "denied", "page.tsx"), stubAdmin);
  wroteStubs = true;

  runNextBuild(env);

  const outDir = path.join(root, "out");
  writeFileSync(path.join(outDir, ".nojekyll"), "");

  // next-intl localized pathnames are URL aliases; App Router folders keep
  // the source segment. Copy EN aliases so Links like /en/disaster-data work.
  const enAliases = [
    ["data-bencana", "disaster-data"],
    ["anggaran-bencana", "disaster-budget"],
    ["publikasi", "publications"],
    ["sumber-data", "data-sources"],
    ["metodologi", "methodology"],
  ];
  for (const [from, to] of enAliases) {
    const src = path.join(outDir, "en", from);
    const dest = path.join(outDir, "en", to);
    if (existsSync(src) && !existsSync(dest)) {
      cpSync(src, dest, { recursive: true });
    }
  }

  writeFileSync(
    path.join(outDir, "index.html"),
    `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0; url=./id/" />
  <link rel="canonical" href="./id/" />
  <title>Aceh Tangguh</title>
</head>
<body>
  <p><a href="./id/">Aceh Tangguh</a></p>
</body>
</html>
`
  );
} finally {
  if (wroteStubs) {
    rmSync(path.join(root, "src", "app", "[locale]", "admin"), {
      recursive: true,
      force: true,
    });
  }
  restore();
  rmSync(parkRoot, { recursive: true, force: true });
}

// Drop export-only Next types (stub /admin/page) so `tsc` on the Node app still works.
rmSync(path.join(root, ".next"), { recursive: true, force: true });
