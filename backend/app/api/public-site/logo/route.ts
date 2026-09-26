import { getPublicSiteLogo } from "@/db/public-site";
import { getAttendanceFile } from "@/db/attendance";

/**
 * LOGO UTAMA WEBSITE (publik, read-only) — public_site_settings.logo_key.
 * Kunci R2 tidak pernah dikirim ke klien. Tidak ada logo / file hilang → 404 (komponen BrandLogo
 * otomatis memakai fallback berikutnya, tidak ada ikon gambar rusak).
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const row = await getPublicSiteLogo();
    if (!row?.logoKey) return new Response("Logo belum diatur", { status: 404 });
    const object = await getAttendanceFile(row.logoKey);
    if (!object) return new Response("Logo tidak ditemukan", { status: 404 });
    const versioned = new URL(request.url).searchParams.has("v");
    return new Response(object.body, {
      headers: {
        "content-type": object.httpMetadata?.contentType || "image/webp",
        // URL berversi (v = updated_at settings) → aman di-cache lebih lama; tanpa versi → singkat.
        "cache-control": versioned ? "public, max-age=86400, stale-while-revalidate=604800" : "public, max-age=300",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Logo belum dapat dibuka", { status: 503 });
  }
}
