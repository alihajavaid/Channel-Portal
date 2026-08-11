import { NextResponse } from "next/server";
import { startMfaEnrollment } from "@/lib/services/mfa.service";

export async function POST() {
  const result = await startMfaEnrollment();
  if (!result) {
    return NextResponse.json({ error: "no_active_bridge" }, { status: 401 });
  }
  return NextResponse.json(result);
}
