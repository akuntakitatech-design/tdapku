import { versionTag } from "@/lib/public-image";

/**
 * Respons gambar PUBLIK yang ringan & cacheable (khusus route media publik; JANGAN dipakai untuk media privat).
 *
 * - ETag dari kunci objek → If-None-Match dijawab 304 TANPA mengambil ulang objek dari R2.
 * - URL ber-versi yang cocok (?v=…) → `immutable` 1 tahun (versi baru = URL baru).
 * - Tanpa versi / versi lama → TTL pendek + stale-while-revalidate (perubahan tetap cepat terlihat).
 * - Body tetap di-stream (tidak di-buffer).
 */
export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

export function publicImageEtag(key: string) {
  return `"${versionTag(key)}-${key.length.toString(36)}"`;
}

export function publicImageCacheControl(requestedVersion: string | null, currentVersion: string | null, fallback: string) {
  return requestedVersion && currentVersion && requestedVersion === currentVersion ? IMMUTABLE_CACHE : fallback;
}

export function notModified(request: Request, etag: string, cacheControl: string) {
  const header = request.headers.get("if-none-match");
  if (!header) return null;
  const match = header.split(",").some((value) => value.trim().replace(/^W\//, "") === etag);
  return match ? new Response(null, { status: 304, headers: { etag, "cache-control": cacheControl } }) : null;
}

export function publicImageResponse(body: ReadableStream<Uint8Array> | null, options: {
  contentType: string; etag: string; cacheControl: string; size?: number | null;
}) {
  const headers = new Headers({
    "content-type": options.contentType,
    "cache-control": options.cacheControl,
    etag: options.etag,
    "x-content-type-options": "nosniff",
  });
  if (options.size && options.size > 0) headers.set("content-length", String(options.size));
  return new Response(body, { headers });
}
