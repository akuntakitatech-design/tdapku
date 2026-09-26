import { accessErrorResponse, requireKetua } from "@/db/access-control";
import {
  createFooterSection,
  getFooterSectionForAdmin,
  getPublicSiteSettings,
  listPublicNavigation,
  setPublicSiteSectionContent,
  setPublicSiteSectionStatus,
  setPublicSiteSectionVisibility,
} from "@/db/public-site";
import { buildPublicChrome } from "@/db/public-homepage";
import { defaultFooterConfig, normalizeFooterConfig } from "@/lib/public-footer";
import { globalLogoUrl } from "@/lib/public-logo";

/*
 * ADMIN Footer Builder. Otorisasi = CMS existing (requireKetua) untuk semua method.
 * Penyimpanan: public_site_sections section_key "footer" (content_json + image_key), mekanisme draft/publish existing.
 * Payload klien TIDAK dipercaya: selalu dinormalisasi & divalidasi ketat di server (lib/public-footer.ts).
 * Hanya menyentuh baris section footer.
 */
export const dynamic = "force-dynamic";

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

const MAX_BODY = 64 * 1024;

export async function GET() {
  try {
    await requireKetua();
    const [section, settingsRow, navRows] = await Promise.all([
      getFooterSectionForAdmin(),
      getPublicSiteSettings().catch(() => null),
      listPublicNavigation(undefined, true).catch(() => []),
    ]);
    // Settings publik tervalidasi → untuk preview mode "Pengaturan Website" (inherit), sama persis dengan publik.
    const chrome = buildPublicChrome(settingsRow, navRows, null);
    return Response.json({
      section: section
        ? {
            id: section.id, status: section.status, isVisible: section.isVisible, publishedAt: section.publishedAt,
            updatedAt: section.updatedAt, hasImage: section.hasImage, publishedHasImage: section.publishedHasImage,
            hasUnpublishedChanges: section.hasUnpublishedChanges,
          }
        : null,
      draft: normalizeFooterConfig(section ? section.working : defaultFooterConfig(), false).value,
      published: section?.published ? normalizeFooterConfig(section.published, false).value : null,
      settings: chrome.settings,
      navigation: chrome.navigation,
      // Logo Utama (untuk preview mode inherit). Draft logo khusus: /api/public-site/admin/section?id=…
      logos: { globalSrc: globalLogoUrl(Number(settingsRow?.hasLogo ?? 0) === 1, settingsRow?.updatedAt) },
    });
  } catch (reason) {
    return accessErrorResponse(reason, "Footer belum dapat dimuat.");
  }
}

/** Simpan Draft (working copy). Versi live tidak berubah sampai Publish. */
export async function PUT(request: Request) {
  try {
    const user = await requireKetua();
    const length = Number(request.headers.get("content-length") || 0);
    if (length > MAX_BODY) return Response.json({ error: "Konfigurasi footer terlalu besar." }, { status: 413 });
    const input = await readJson(request);
    const { value, errors } = normalizeFooterConfig(input.config, true);
    if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });
    const json = JSON.stringify(value);
    const existing = await getFooterSectionForAdmin();
    if (existing) await setPublicSiteSectionContent(existing.id, json, user.id);
    else await createFooterSection(json, user.id);
    const section = await getFooterSectionForAdmin();
    return Response.json({ success: true, id: section?.id, status: section?.status, hasUnpublishedChanges: section?.hasUnpublishedChanges ?? false });
  } catch (reason) {
    return accessErrorResponse(reason, "Draft footer belum dapat disimpan.");
  }
}

/** Publish / Unpublish / tampilkan-sembunyikan footer builder. */
export async function PATCH(request: Request) {
  try {
    const user = await requireKetua();
    const input = await readJson(request);
    const section = await getFooterSectionForAdmin();
    if (!section) return Response.json({ error: "Simpan draft footer terlebih dahulu." }, { status: 404 });
    if (input.action === "publish") {
      // Validasi ulang working copy di server sebelum dijadikan versi live.
      const { errors } = normalizeFooterConfig(section.working, true);
      if (errors.length) return Response.json({ error: `Draft belum valid: ${errors[0]}`, errors }, { status: 400 });
      await setPublicSiteSectionStatus(section.id, "published", user.id);
    } else if (input.action === "unpublish") {
      await setPublicSiteSectionStatus(section.id, "draft", user.id);
    } else if (input.action === "visibility" && typeof input.isVisible === "boolean") {
      await setPublicSiteSectionVisibility(section.id, input.isVisible, user.id);
    } else {
      return Response.json({ error: "Aksi tidak valid." }, { status: 400 });
    }
    const next = await getFooterSectionForAdmin();
    return Response.json({ success: true, status: next?.status, isVisible: next?.isVisible, publishedAt: next?.publishedAt });
  } catch (reason) {
    return accessErrorResponse(reason, "Status footer belum dapat diperbarui.");
  }
}
