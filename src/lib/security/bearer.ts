import { createHash, timingSafeEqual } from "crypto";

/** Constant-time compare of a Bearer header to a secret. */
export function bearerMatches(header: string | null | undefined, secret: string): boolean {
  if (!header || !secret) return false;
  const expected = `Bearer ${secret}`;
  const a = createHash("sha256").update(header).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
