import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx.userId) {
    return NextResponse.json({ user: null, profile: null });
  }
  return NextResponse.json({
    user: { id: ctx.userId, email: ctx.email },
    profile: ctx.profile,
  });
}
