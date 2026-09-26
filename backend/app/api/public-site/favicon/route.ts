import { getPublicSiteFavicon } from "@/db/public-site";
import { getAttendanceFile } from "@/db/attendance";
import { DEFAULT_FAVICON } from "@/lib/public-favicon";
import { versionTag } from "@/lib/public-image";
import { notModified, publicImageCacheControl, publicImageEtag, publicImageResponse } from "@/lib/public-image-response";

/**
 * Favicon PUBLIK. Custom (public_site_settings.favicon_key) bila ada & dapat dibuka; selain itu redirect ke favicon
 * default statis → tidak pernah ada favicon rusak. ?v=<tag kunci> yang cocok → immutable (ganti favicon = URL baru).
 */
export const dynamic = "force-dynamic";

const SHORT_CACHE = "public, max-age=300, stale-while-revalidate=86400";

function fallback(request: Request) {
  return new Response(null, { status: 302, headers: { location: new URL(DEFAULT_FAVICON, request.url).pathname, "cache-control": "public, max-age=300" } });
}

export async function GET(request: Request) {
  try {
    const row = await getPublicSiteFavicon();
    if (!row?.faviconKey) return fallback(request);
    const etag = publicImageEtag(row.faviconKey);
    const cacheControl = publicImageCacheControl(new URL(request.url).searchParams.get("v"), versionTag(row.faviconKey), SHORT_CACHE);
    const cached = notModified(request, etag, cacheControl);
    if (cached) return cached;
    const object = await getAttendanceFile(row.faviconKey);
    if (!object) return fallback(request);
    const contentType = object.httpMetadata?.contentType || "image/png";
    const response = publicImageResponse(object.body, { contentType, etag, cacheControl, size: object.size });
    // SVG: cegah eksekusi script bila URL dibuka langsung.
    response.headers.set("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    return response;
  } catch {
    return fallback(request);
  }
}
