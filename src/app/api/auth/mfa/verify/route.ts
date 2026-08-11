import { NextRequest, NextResponse } from "next/server";
import { MfaVerifySchema } from "@/lib/validation/auth";
import { verifyMfaChallenge } from "@/lib/services/mfa.service";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = MfaVerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const result = await verifyMfaChallenge(parsed.data.code);
  if (result.status === "locked") {
    return NextResponse.json({ error: "locked", retryAt: result.retryAt }, { status: 423 });
  }
  if (result.status === "invalid") {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }
  return NextResponse.json({ status: "done" });
}
