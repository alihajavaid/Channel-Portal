import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { RegenerateRecoveryCodesSchema } from "@/lib/validation/auth";
import { regenerateRecoveryCodes, InvalidCurrentPasswordError, MfaNotEnabledError } from "@/lib/services/mfa.service";

export const POST = withAuth("any", async (req, _ctx, session) => {
  const body = await req.json().catch(() => null);
  const parsed = RegenerateRecoveryCodesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const recoveryCodes = await regenerateRecoveryCodes(session.user.id, parsed.data.currentPassword);
    return NextResponse.json({ recoveryCodes });
  } catch (err) {
    if (err instanceof InvalidCurrentPasswordError) {
      return NextResponse.json({ error: "invalid_current_password" }, { status: 403 });
    }
    if (err instanceof MfaNotEnabledError) {
      return NextResponse.json({ error: "mfa_not_enabled" }, { status: 409 });
    }
    throw err;
  }
});
