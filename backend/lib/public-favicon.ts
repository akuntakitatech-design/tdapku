import { versionTag } from "@/lib/public-image";

/** Favicon default TDA (file statis, selalu tersedia). */
export const DEFAULT_FAVICON = "/favicon.svg";
export const FAVICON_MAX_BYTES = 512 * 1024;
export const FAVICON_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

/** Tipe MIME dari file unggahan (browser kadang mengirim ICO/SVG tanpa MIME yang benar → cek ekstensi). */
export function faviconMime(file: File) {
  if (FAVICON_TYPES[file.type]) return file.type === "image/vnd.microsoft.icon" ? "image/x-icon" : file.type;
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "png") return "image/png";
  if (ext === "svg") return "image/svg+xml";
  if (ext === "ico") return "image/x-icon";
  return null;
}

/** URL favicon aktif untuk <head>: custom (ber-versi = cache busting) atau default statis. */
export function faviconHref(faviconKey: string | null | undefined) {
  return faviconKey ? `/api/public-site/favicon?v=${versionTag(faviconKey)}` : DEFAULT_FAVICON;
}
