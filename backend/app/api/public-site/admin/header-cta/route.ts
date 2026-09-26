import { accessErrorResponse, requireKetua } from "@/db/access-control";
import { getHeaderCtaRaw, setHeaderCta } from "@/db/public-site";
import { HEADER_CTA_DEFAULT, readHeaderCta, resolveHeaderCta, validateHeaderCta } from "@/lib/public-header-cta";

/*
 * ADMIN CTA HEADER (Website Publik → Navigasi). Otorisasi = CMS existing (requireKetua).
 * Penyimpanan: public_site_sections "header".content_json.cta — tanpa tabel/kolom baru. Berlaku langsung.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireKetua();
    const saved = readHeaderCta(await getHeaderCtaRaw().catch(() => null));
    const config = saved ?? HEADER_CTA_DEFAULT;
    return Response.json({ config, isDefault: !saved, resolved: resolveHeaderCta(saved) });
  } catch (reason) {
    return accessErrorResponse(reason, "CTA header belum dapat dimuat.");
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireKetua();
    let input: Record<string, unknown> = {};
    try { input = await request.json(); } catch { input = {}; }
    const result = validateHeaderCta(input);
    if (!result.ok) return Response.json({ error: Object.values(result.errors)[0], errors: result.errors }, { status: 400 });
    await setHeaderCta(result.value, user.id);
    return Response.json({ success: true, config: result.value, isDefault: false, resolved: resolveHeaderCta(result.value) });
  } catch (reason) {
    return accessErrorResponse(reason, "CTA header belum dapat disimpan.");
  }
}
