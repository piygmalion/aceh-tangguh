import { NextRequest, NextResponse } from "next/server";
import { clientIp, HOUR_MS, rateLimitAsync } from "./rate-limit";
import { rejectCrossOrigin } from "./origin";

export async function guardPublicPost(
  req: NextRequest,
  bucket: string,
  limit: number
): Promise<NextResponse | null> {
  const cross = rejectCrossOrigin(req);
  if (cross) return cross;

  const ip = clientIp(req.headers);
  const outcome = await rateLimitAsync(`${bucket}:${ip}`, limit, HOUR_MS);

  if (outcome.allowed) return null;

  if (outcome.reason === "rate_limit_unconfigured") {
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 }
    );
  }

  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
