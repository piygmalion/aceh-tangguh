import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const file = path.join(
    process.cwd(),
    "public/fixtures/boundaries-aceh-kab.geojson"
  );
  const raw = await readFile(file, "utf8");
  return NextResponse.json(JSON.parse(raw));
}
