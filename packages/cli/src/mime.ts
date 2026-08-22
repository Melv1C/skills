const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
};

const HTML_EXTS = new Set([".html", ".htm"]);

export const HTML_MIME = "text/html";
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export function extOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return "";
  return filename.slice(dot).toLowerCase();
}

export function isHtmlPath(filename: string): boolean {
  return HTML_EXTS.has(extOf(filename));
}

export function mimeFor(filename: string): string | null {
  const mime = MIME_BY_EXT[extOf(filename)];
  return mime ?? null;
}
