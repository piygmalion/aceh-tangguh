import { NextRequest, NextResponse } from "next/server";

function requestHost(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host") ||
    ""
  );
}

function hostMismatchResponse(): NextResponse {
  return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
}

function hostFromUrl(raw: string): string | null {
  try {
    return new URL(raw).host;
  } catch {
    return null;
  }
}

function rejectIfHostMismatch(sourceUrl: string, expectedHost: string): NextResponse | null {
  const sourceHost = hostFromUrl(sourceUrl);
  if (!sourceHost) return hostMismatchResponse();
  if (sourceHost !== expectedHost) return hostMismatchResponse();
  return null;
}

/**
 * Reject browser POSTs whose Origin or Referer does not match this host.
 * Requests without Origin and Referer (curl, cron) are allowed.
 */
export function rejectCrossOrigin(req: NextRequest): NextResponse | null {
  const host = requestHost(req);
  if (!host) return null;

  const origin = req.headers.get("origin");
  if (origin) return rejectIfHostMismatch(origin, host);

  const referer = req.headers.get("referer");
  if (referer) return rejectIfHostMismatch(referer, host);

  return null;
}
