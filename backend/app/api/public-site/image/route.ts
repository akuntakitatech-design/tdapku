import { getLiveSectionImage } from "@/db/public-site";
import { getAttendanceFile } from "@/db/attendance";

/**
 * Gambar PUBLIK untuk section Website yang LIVE (published + visible, dari snapshot publish).
 * Kunci objek R2 tidak pernah dikirim ke klien; lookup berdasarkan section_key + slot + index.
 * Draft / hidden / archived → 404.
 */
export const dynamic = "force-dynamic";

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

    const object = await getAttendanceFile(image.key);
    if (!object) return new Response("Foto tidak ditemukan", { status: 404 });

    return new Response(object.body, {
      headers: {
        "content-type": image.type || object.httpMetadata?.contentType || "image/jpeg",
        "cache-control": "public, max-age=300",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Foto belum dapat dibuka", { status: 503 });
  }
}
