import { getPublicHomepage } from "@/db/public-homepage";

/**
 * Endpoint PUBLIK read-only konten Website (homepage).
 * Hanya section status = published + is_visible = 1 (versi live). Tanpa auth, tanpa data admin/draft.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getPublicHomepage();
    return Response.json(data, {
      headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch {
    return Response.json({ error: "Konten website belum dapat dimuat." }, { status: 503 });
  }
}
