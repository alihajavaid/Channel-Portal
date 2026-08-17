"use client";

import { useRef, useState } from "react";
import { apiJson } from "@/lib/client/api";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const confirm = useConfirm();

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
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
        showToast(data.message ?? "Could not upload this file.", "error");
        return;
      }
      setDocuments((prev) => [...prev, data.data as Document]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      showToast("File uploaded.");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(id: string) {
    const confirmed = await confirm("Delete this document?", { title: "Delete document" });
    if (!confirmed) return;
    const { ok } = await apiJson(`/api/documents/${id}`, { method: "DELETE" });
    if (ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      showToast("Document deleted.");
    } else {
      showToast("Could not delete this document.", "error");
    }
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 font-medium text-slate-900 dark:text-slate-100">Documents</h2>
      {documents.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No documents uploaded yet.</p>}
      <ul className="mb-3 space-y-2">
        {documents.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between text-sm">
            <a href={`/api/documents/${doc.id}`} className="text-slate-900 hover:text-brand hover:underline dark:text-slate-100">
              {doc.name}
            </a>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatBytes(doc.sizeBytes)} · {doc.uploadedBy.name} ·{" "}
              <button onClick={() => onDelete(doc.id)} className="text-red-600 hover:underline dark:text-red-400">
                delete
              </button>
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={onUpload} className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.xlsx,image/*"
          className="text-sm text-slate-700 dark:text-slate-300"
        />
        <button
          type="submit"
          disabled={uploading}
          className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </form>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">PDF, DOCX, XLSX, or images, up to 25MB.</p>
    </div>
  );
}
