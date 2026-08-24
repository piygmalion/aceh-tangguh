import { NextRequest, NextResponse } from "next/server";

/**
 * Reject browser POSTs whose Origin does not match this host.
 * Requests without Origin (curl, cron, same-site navigations) are allowed.
 */
export function rejectCrossOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host") ||
    "";
  if (!host || originHost !== host) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  return null;
}
