import assert from "node:assert/strict";
import { test } from "node:test";
import {
  collectReferencedMediaPaths,
  findOrphanMediaPaths,
} from "./media-gc";

test("collectReferencedMediaPaths walks nested jawaban_json", () => {
  const paths = collectReferencedMediaPaths({
    foto: ["kejadian/foto/a.jpg", "not-a-path"],
    nested: { video: ["penanganan/video/b.mp4"] },
    ignore: "kejadian/foto/",
  });
  assert.deepEqual(Array.from(paths).sort(), [
    "kejadian/foto/a.jpg",
    "penanganan/video/b.mp4",
  ]);
});

test("findOrphanMediaPaths skips young and referenced objects", () => {
  const now = Date.parse("2026-08-26T12:00:00.000Z");
  const referenced = new Set(["kejadian/foto/keep.jpg"]);
  const orphans = findOrphanMediaPaths(
    [
      {
        prefix: "kejadian/foto",
        items: [
          { name: "keep.jpg", created_at: "2026-08-20T00:00:00.000Z" },
          { name: "old.jpg", created_at: "2026-08-20T00:00:00.000Z" },
          { name: "fresh.jpg", created_at: "2026-08-26T10:00:00.000Z" },
          { name: "nodate.jpg", created_at: null },
        ],
      },
    ],
    referenced,
    now,
    48 * 60 * 60 * 1000
  );
  assert.deepEqual(orphans, [
    { path: "kejadian/foto/old.jpg", createdAt: "2026-08-20T00:00:00.000Z" },
  ]);
});
