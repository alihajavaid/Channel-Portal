import { NextRequest, NextResponse } from "next/server";
import { TotpCodeSchema } from "@/lib/validation/auth";
import { confirmMfaEnrollment } from "@/lib/services/mfa.service";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = TotpCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const result = await confirmMfaEnrollment(parsed.data.code);
  if (result.status === "invalid") {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }
  if (result.status === "no_pending_enrollment") {
    return NextResponse.json({ error: "no_pending_enrollment" }, { status: 400 });
  }
  return NextResponse.json({ status: "done", recoveryCodes: result.recoveryCodes });
}
