import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/authz/guard";
import { getDocumentWithParentModule, deleteDocument, documentFilePath } from "@/lib/services/document.service";
import { contentDispositionFilename } from "@/lib/storage/sanitize";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth<Ctx>("any", async (_req, ctx, session) => {
  const { id } = await ctx.params;
  const result = await getDocumentWithParentModule(id);
  if (!result || !result.module) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!session.user[result.module]) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const filePath = documentFilePath(result.document.storageKey);
  const stats = await stat(filePath).catch(() => null);
  if (!stats) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  return new Response(stream, {
    headers: {
      "Content-Type": result.document.mimeType,
      "Content-Length": String(stats.size),
      "Content-Disposition": `attachment; ${contentDispositionFilename(result.document.name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
});

export const DELETE = withAuth<Ctx>("any", async (_req, ctx, session) => {
  const { id } = await ctx.params;
  const result = await getDocumentWithParentModule(id);
  if (!result || !result.module) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!session.user[result.module]) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  await deleteDocument(id);
  return NextResponse.json({ status: "done" });
});
