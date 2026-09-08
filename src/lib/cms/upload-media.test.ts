import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import sharp from "sharp";
import { isCmsCoverUrlColumn } from "./cover-fields";
import {
  CMS_COVER_MAX_BYTES,
  CMS_MEDIA_BUCKET,
  cmsMediaPublicUrl,
  prepareCmsCoverUpload,
} from "./upload-media";

const ROOT = process.cwd();

describe("DATA-28 cms-media migration", () => {
  it("adds cms-media without dropping laporan-media policies", () => {
    const sql = readFileSync(
      join(ROOT, "supabase/migrations/20260929_cms_media.sql"),
      "utf8"
    );
    assert.match(sql, /cms-media/);
    assert.match(sql, /5242880/);
    assert.match(sql, /image\/jpeg/);
    assert.match(sql, /image\/png/);
    assert.match(sql, /image\/webp/);
    assert.match(sql, /true,\s*5242880/);
    assert.equal(sql.includes("drop policy") && sql.includes("laporan-media"), false);
    assert.match(sql, /service role|service_role|BE-36/i);
  });
});

describe("prepareCmsCoverUpload", () => {
  it("re-encodes JPEG and builds sampul UUID path", async () => {
    const jpeg = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .jpeg()
      .toBuffer();
    const result = await prepareCmsCoverUpload(jpeg, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.mime, "image/jpeg");
    assert.equal(result.path, "sampul/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg");
    assert.equal(result.buffer.equals(jpeg), false);
    assert.equal(CMS_MEDIA_BUCKET, "cms-media");
  });

  it("rejects HTML disguised as jpeg and oversized buffers", async () => {
    const html = Buffer.concat([Buffer.from("<!DOCTYPE html>"), Buffer.alloc(20)]);
    const badType = await prepareCmsCoverUpload(html);
    assert.equal(badType.ok, false);
    if (badType.ok) return;
    assert.equal(badType.status, 400);

    const huge = Buffer.alloc(CMS_COVER_MAX_BYTES + 1, 0xff);
    const tooBig = await prepareCmsCoverUpload(huge);
    assert.equal(tooBig.ok, false);
    if (tooBig.ok) return;
    assert.equal(tooBig.status, 400);
  });
});

describe("cms cover wiring AN-50", () => {
  it("marks sampul URL columns and builds public storage URL", () => {
    assert.equal(isCmsCoverUrlColumn("foto_sampul_url"), true);
    assert.equal(isCmsCoverUrlColumn("foto_sampul_thumbnail_url"), true);
    assert.equal(isCmsCoverUrlColumn("url"), false);
    assert.match(
      cmsMediaPublicUrl("sampul/x.jpg"),
      /\/storage\/v1\/object\/public\/cms-media\/sampul\/x\.jpg$/
    );
  });

  it("staff upload route uses super admin + origin, not public laporan guard", () => {
    const route = readFileSync(join(ROOT, "src/app/api/admin/cms/upload/route.ts"), "utf8");
    assert.match(route, /requireSuperAdminApi/);
    assert.match(route, /rejectCrossOrigin/);
    assert.match(route, /CMS_MEDIA_BUCKET/);
    assert.match(route, /createServiceClient/);
    assert.equal(route.includes("guardPublicPost"), false);
    assert.equal(route.includes("laporan-media"), false);

    const laporan = readFileSync(join(ROOT, "src/app/api/laporan/upload/route.ts"), "utf8");
    assert.match(laporan, /guardPublicPost/);
    assert.match(laporan, /laporan-media/);
  });

  it("inventory lists staff POST cms upload; UI posts there not laporan", () => {
    const surface = readFileSync(join(ROOT, "security/attack-surface.md"), "utf8");
    assert.match(surface, /\/api\/admin\/cms\/upload/);
    assert.match(surface, /Super-admin \+ `rejectCrossOrigin`/);

    const explorer = readFileSync(join(ROOT, "src/components/admin/DatabaseExplorer.tsx"), "utf8");
    assert.match(explorer, /CmsCoverField/);
    assert.equal(explorer.includes("/api/laporan/upload"), false);

    const field = readFileSync(join(ROOT, "src/components/admin/CmsCoverField.tsx"), "utf8");
    assert.match(field, /\/api\/admin\/cms\/upload/);
    assert.equal(field.includes("/api/laporan/upload"), false);

    const id = JSON.parse(readFileSync(join(ROOT, "messages/id.json"), "utf8")) as {
      admin: Record<string, string>;
    };
    const en = JSON.parse(readFileSync(join(ROOT, "messages/en.json"), "utf8")) as {
      admin: Record<string, string>;
    };
    for (const key of ["cmsCoverPick", "cmsCoverUploading", "cmsCoverError", "cmsCoverHint"]) {
      assert.equal(typeof id.admin[key], "string");
      assert.equal(typeof en.admin[key], "string");
      assert.notEqual(id.admin[key], en.admin[key]);
    }
  });
});
