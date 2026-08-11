import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { resolveParentModule, uploadDocument, UploadRejectedError } from "@/lib/services/document.service";
import type { ParentRef } from "@/lib/services/document.service";

function maxUploadBytes(): number {
  return Number(process.env.MAX_UPLOAD_BYTES ?? 26_214_400);
}

export const POST = withAuth("any", async (req: NextRequest, _ctx, session) => {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > maxUploadBytes()) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  const channelAccountId = formData?.get("channelAccountId");
  const customerId = formData?.get("customerId");

  if (!(file instanceof File) || (!channelAccountId && !customerId) || (channelAccountId && customerId)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const parent: ParentRef = channelAccountId
    ? { type: "channelAccount", id: String(channelAccountId) }
    : { type: "customer", id: String(customerId) };

  const module = await resolveParentModule(parent);
  if (!module) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!session.user[module]) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const document = await uploadDocument(parent, { name: file.name, buffer }, {
      id: session.user.id,
      name: session.user.name,
    });
    return NextResponse.json({ data: document }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadRejectedError) {
      return NextResponse.json({ error: "upload_rejected", message: err.message }, { status: 400 });
    }
    throw err;
  }
});
