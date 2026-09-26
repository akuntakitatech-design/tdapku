import { accessErrorResponse, requireKetua } from "@/db/access-control";
import { getPublicSiteFavicon, setPublicSiteFaviconKey } from "@/db/public-site";
import { FAVICON_MAX_BYTES, FAVICON_TYPES, faviconHref, faviconMime } from "@/lib/public-favicon";

/*
 * ADMIN FAVICON (Website Publik → Pengaturan Website → Identitas Website).
 * Disimpan di kolom EXISTING public_site_settings.favicon_key (tanpa perubahan skema). Berlaku langsung.
 * R2 SAFETY (NON-DESTRUCTIVE): ganti / kembali ke default HANYA mengubah referensi; objek R2 lama tidak pernah dihapus.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireKetua();
    const row = await getPublicSiteFavicon();
    return Response.json({ hasFavicon: Boolean(row?.faviconKey), href: faviconHref(row?.faviconKey) });
  } catch (reason) {
    return accessErrorResponse(reason, "Favicon belum dapat dimuat.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireKetua();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Pilih file favicon terlebih dahulu." }, { status: 400 });
    const mime = faviconMime(file);
    if (!mime) return Response.json({ error: "Format favicon harus PNG, SVG, atau ICO." }, { status: 400 });
    if (file.size > FAVICON_MAX_BYTES) return Response.json({ error: "Ukuran favicon maksimal 512 KB." }, { status: 400 });
    if (mime === "image/svg+xml") {
      const text = await file.text();
      if (!/<svg[\s>]/i.test(text) || /<script|on[a-z]+\s*=|javascript:/i.test(text)) {
        return Response.json({ error: "File SVG tidak valid atau mengandung script." }, { status: 400 });
      }
    }
    const ext = FAVICON_TYPES[mime] || "png";
    const typed = new File([await file.arrayBuffer()], `favicon.${ext}`, { type: mime });
    const { saveAttendanceFile } = await import("@/db/attendance");
    const key = await saveAttendanceFile("public-site/favicon", typed);
    await setPublicSiteFaviconKey(key, user.id);
    // File favicon lama tetap disimpan di R2 (tidak dihapus otomatis).
    return Response.json({ success: true, href: faviconHref(key), previousFile: "kept" });
  } catch (reason) {
    return accessErrorResponse(reason, "Favicon belum dapat disimpan.");
  }
}

export async function DELETE() {
  try {
    const user = await requireKetua();
    await setPublicSiteFaviconKey(null, user.id);
    // Kembali ke favicon default: hanya referensi dilepas; objek R2 tetap disimpan.
    return Response.json({ success: true, href: faviconHref(null), previousFile: "kept" });
  } catch (reason) {
    return accessErrorResponse(reason, "Favicon belum dapat dikembalikan ke default.");
  }
}
