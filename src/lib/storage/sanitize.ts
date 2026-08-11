// Sanitizes a filename for use only in the Content-Disposition header value — never for
// constructing a filesystem path (documents are stored under an opaque UUID, so path
// traversal from a malicious filename is impossible by construction, not by sanitization).
export function contentDispositionFilename(name: string): string {
  const ascii = name.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  const utf8 = encodeURIComponent(name);
  return `filename="${ascii}"; filename*=UTF-8''${utf8}`;
}
