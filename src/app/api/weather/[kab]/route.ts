import { NextResponse } from "next/server";
import { getWeatherBySlug } from "@/lib/weather/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { kab: string } },
) {
  const forecast = await getWeatherBySlug(params.kab);
  if (!forecast) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(forecast);
}
