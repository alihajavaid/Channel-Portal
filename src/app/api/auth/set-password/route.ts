import { NextRequest, NextResponse } from "next/server";
import { SetPasswordSchema } from "@/lib/validation/auth";
import { completeSetPassword } from "@/lib/services/auth.service";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = SetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
  }

  const result = await completeSetPassword(parsed.data.newPassword);
  if (result.status === "invalid_credentials") {
    return NextResponse.json({ error: "no_active_bridge" }, { status: 401 });
  }
  return NextResponse.json({ status: result.status });
}
