import { NextResponse } from "next/server";
import { getWeatherForecasts } from "@/lib/weather/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const data = await getWeatherForecasts();
  return NextResponse.json(data);
}
