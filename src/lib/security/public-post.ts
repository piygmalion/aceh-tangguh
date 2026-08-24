import { NextRequest, NextResponse } from "next/server";
import { clientIp, HOUR_MS, rateLimit } from "./rate-limit";
import { rejectCrossOrigin } from "./origin";

export function guardPublicPost(
  req: NextRequest,
  bucket: string,
  limit: number
): NextResponse | null {
  const cross = rejectCrossOrigin(req);
  if (cross) return cross;
  const ip = clientIp(req.headers);
  if (!rateLimit(`${bucket}:${ip}`, limit, HOUR_MS)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  return null;
}
