import { getPublicMediaImageRef } from "@/db/public-media";
import { getAttendanceFile } from "@/db/attendance";
import { versionTag } from "@/lib/public-image";
import { notModified, publicImageCacheControl, publicImageEtag, publicImageResponse } from "@/lib/public-image-response";

/** Gambar galeri/banner PUBLIK (hanya media aktif). ETag/304 + immutable bila ?v= cocok. */
const SHORT_CACHE = "public, max-age=3600, stale-while-revalidate=86400";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1)
    return new Response("Not found", { status: 404 });
  try {
    const row = await getPublicMediaImageRef(id, true);
    if (!row) return new Response("Not found", { status: 404 });
    const etag = publicImageEtag(row.imageKey);
    const cacheControl = publicImageCacheControl(new URL(request.url).searchParams.get("v"), versionTag(row.imageKey), SHORT_CACHE);
    const cached = notModified(request, etag, cacheControl);
    if (cached) return cached;
    const object = await getAttendanceFile(row.imageKey);
    if (!object) return new Response("Not found", { status: 404 });
    return publicImageResponse(object.body, { contentType: row.imageType || "image/jpeg", etag, cacheControl, size: object.size });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
