import { NextRequest, NextResponse } from "next/server";
import { LoginSchema } from "@/lib/validation/auth";
import { attemptLogin } from "@/lib/services/auth.service";

function requestMeta(req: NextRequest) {
  return {
    ipAddress: req.headers.get("x-forwarded-for") ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const result = await attemptLogin(parsed.data.email, parsed.data.password, requestMeta(req));

  switch (result.status) {
    case "invalid_credentials":
      return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
    case "locked":
      return NextResponse.json({ error: "locked", retryAt: result.retryAt }, { status: 423 });
    default:
      return NextResponse.json({ status: result.status });
  }
}
