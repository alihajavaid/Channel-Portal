"use client";

import { useRef, useState } from "react";
import { apiJson } from "@/lib/client/api";

type Document = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: { name: string };
};

type AttachedTo = { type: "channelAccount" | "customer"; id: string };

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({ attachedTo, initialDocuments }: { attachedTo: AttachedTo; initialDocuments: Document[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(attachedTo.type === "channelAccount" ? "channelAccountId" : "customerId", attachedTo.id);

      const { ok, data } = await apiJson<{ data?: Document; error?: string; message?: string }>(
        "/api/documents",
        { method: "POST", body: formData }
      );
      if (!ok) {
        setError(data.message ?? "Could not upload this file.");
        return;
      }
      setDocuments((prev) => [...prev, data.data as Document]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    const { ok } = await apiJson(`/api/documents/${id}`, { method: "DELETE" });
    if (ok) setDocuments((prev) => prev.filter((d) => d.id !== id));
    else setError("Could not delete this document.");
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="mb-3 font-medium text-slate-900">Documents</h2>
      {documents.length === 0 && <p className="text-sm text-slate-500">No documents uploaded yet.</p>}
      <ul className="mb-3 space-y-2">
        {documents.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between text-sm">
            <a href={`/api/documents/${doc.id}`} className="text-slate-900 hover:underline">
              {doc.name}
            </a>
            <span className="text-xs text-slate-500">
              {formatBytes(doc.sizeBytes)} · {doc.uploadedBy.name} ·{" "}
              <button onClick={() => onDelete(doc.id)} className="text-red-600 hover:underline">
                delete
              </button>
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={onUpload} className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.xlsx,image/*" className="text-sm" />
        <button
          type="submit"
          disabled={uploading}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-slate-400">PDF, DOCX, XLSX, or images, up to 25MB.</p>
    </div>
  );
}
