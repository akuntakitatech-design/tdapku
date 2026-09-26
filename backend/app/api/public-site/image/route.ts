import { getLiveSectionImage } from "@/db/public-site";
import { getAttendanceFile } from "@/db/attendance";
import { notModified, publicImageCacheControl, publicImageEtag, publicImageResponse } from "@/lib/public-image-response";

/**
 * Gambar PUBLIK untuk section Website yang LIVE (published + visible, dari snapshot publish).
 * Kunci objek R2 tidak pernah dikirim ke klien; lookup berdasarkan section_key + slot + index.
 * Draft / hidden / archived → 404.
 *
 * Cache: URL ber-versi (?v=<published_at>) yang cocok dengan versi LIVE → immutable 1 tahun; lainnya TTL pendek.
 * ETag + If-None-Match → 304 tanpa mengambil ulang objek dari R2.
 */
export const dynamic = "force-dynamic";

const SHORT_CACHE = "public, max-age=300, stale-while-revalidate=86400";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const section = String(url.searchParams.get("section") || "");
    const slot = String(url.searchParams.get("slot") || "main");
    const index = Number(url.searchParams.get("index") || 0);

    if (!/^[a-z0-9-]{1,60}$/.test(section) || !["main", "hero"].includes(slot) || !Number.isInteger(index) || index < 0 || index > 20) {
      return new Response("Permintaan tidak valid", { status: 400 });
    }

    const image = await getLiveSectionImage(section, slot as "main" | "hero", index);
    if (!image) return new Response("Foto tidak ditemukan", { status: 404 });

    const etag = publicImageEtag(image.key);
    const cacheControl = publicImageCacheControl(url.searchParams.get("v"), image.version, SHORT_CACHE);
    const cached = notModified(request, etag, cacheControl);
    if (cached) return cached;

    const object = await getAttendanceFile(image.key);
    if (!object) return new Response("Foto tidak ditemukan", { status: 404 });

    return publicImageResponse(object.body, {
      contentType: image.type || object.httpMetadata?.contentType || "image/jpeg",
      etag,
      cacheControl,
      size: object.size,
    });
  } catch {
    return new Response("Foto belum dapat dibuka", { status: 503 });
  }
}
