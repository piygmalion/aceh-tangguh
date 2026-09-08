import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function src(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("FE-52 pager jendela daftar", () => {
  it("listWindow is offset range, empty total is 0–0", async () => {
    const { listWindow } = await import("./list-window");
    assert.deepEqual(listWindow(1, 20, 0), { from: 0, to: 0, total: 0 });
    assert.deepEqual(listWindow(2, 20, 186), { from: 21, to: 40, total: 186 });
    assert.deepEqual(listWindow(10, 20, 186), { from: 181, to: 186, total: 186 });
  });

  it("AdminPager shows showingLabel and does not put total on next", () => {
    const chrome = src("src/components/admin/AdminListChrome.tsx");
    assert.match(chrome, /showingLabel/);
    assert.match(chrome, /listWindow/);
    assert.match(chrome, /TYPE_FLOOR_CLASS/);
    assert.doesNotMatch(chrome, /nextLabel\} \$\{total/);
    assert.doesNotMatch(chrome, /`\(\$\{total\}\)`/);
  });

  it("staff and public lists use AdminPager; calon does not", () => {
    const kejadian = src("src/components/sik/KejadianOpsList.tsx");
    const moderasi = src("src/components/admin/ModerationTable.tsx");
    const db = src("src/components/admin/DatabaseExplorer.tsx");
    const cms = src("src/components/admin/CmsKejadianManager.tsx");
    const table = src("src/components/kejadian/KejadianTable.tsx");
    const calon = src("src/components/sik/CalonKejadianList.tsx");
    assert.match(kejadian, /AdminPager/);
    assert.match(kejadian, /pageSize=\{20\}/);
    assert.match(moderasi, /AdminPager/);
    assert.match(db, /AdminPager/);
    assert.match(cms, /AdminPager/);
    assert.match(table, /AdminPager/);
    assert.doesNotMatch(table, /t\("page", \{ page/);
    assert.doesNotMatch(calon, /AdminPager/);
    assert.doesNotMatch(calon, /pageSize/);
  });
});
