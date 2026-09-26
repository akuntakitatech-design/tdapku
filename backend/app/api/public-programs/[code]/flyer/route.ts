import { getProgramFlyerRef } from "@/db/public-programs";
import { getAttendanceFile } from "@/db/attendance";
import { versionTag } from "@/lib/public-image";
import { notModified, publicImageCacheControl, publicImageEtag, publicImageResponse } from "@/lib/public-image-response";

/**
 * Flyer Program PUBLIK (hanya program yang dipublikasikan). File asli di R2 tidak diubah.
 * ?v=<tag kunci flyer> yang cocok → immutable; ETag/If-None-Match → 304 tanpa fetch ulang R2.
 */
const SHORT_CACHE = "public, max-age=3600, stale-while-revalidate=86400";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const flyer = await getProgramFlyerRef((await params).code);
    if (!flyer) return Response.json({ error: "Flyer belum tersedia." }, { status: 404 });
    const etag = publicImageEtag(flyer.flyerKey);
    const cacheControl = publicImageCacheControl(new URL(request.url).searchParams.get("v"), versionTag(flyer.flyerKey), SHORT_CACHE);
    const cached = notModified(request, etag, cacheControl);
    if (cached) return cached;
    const object = await getAttendanceFile(flyer.flyerKey);
    if (!object) return Response.json({ error: "Flyer belum tersedia." }, { status: 404 });
    return publicImageResponse(object.body, { contentType: flyer.flyerType || "image/jpeg", etag, cacheControl, size: object.size });
  } catch { return Response.json({ error: "Flyer belum dapat dibuka." }, { status: 500 }); }
}
