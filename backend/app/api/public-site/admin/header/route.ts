import { accessErrorResponse, requireKetua } from "@/db/access-control";
import {
  createChromeSection,
  getChromeSectionForAdmin,
  getPublicSiteSettings,
  listPublicNavigation,
  setPublicSiteSectionContent,
  setPublicSiteSectionStatus,
} from "@/db/public-site";
import { buildPublicChrome } from "@/db/public-homepage";
import { defaultHeaderConfig, globalLogoUrl, normalizeHeaderConfig } from "@/lib/public-logo";

/*
 * ADMIN LOGO HEADER. Otorisasi = CMS existing (requireKetua).
 * Penyimpanan: public_site_sections section_key "header" (content_json { logo } + image_key), tanpa tabel/kolom baru.
 * Draft → Preview → Publish memakai snapshot publish existing. Hanya menyentuh baris section header.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireKetua();
    const [section, settingsRow, navRows] = await Promise.all([
      getChromeSectionForAdmin("header"),
      getPublicSiteSettings().catch(() => null),
      listPublicNavigation(undefined, true).catch(() => []),
    ]);
    const chrome = buildPublicChrome(settingsRow, navRows, null, null);
    return Response.json({
      section: section
        ? {
            id: section.id, status: section.status, isVisible: section.isVisible, publishedAt: section.publishedAt,
            updatedAt: section.updatedAt, hasImage: section.hasImage, publishedHasImage: section.publishedHasImage,
            hasUnpublishedChanges: section.hasUnpublishedChanges,
          }
        : null,
      draft: normalizeHeaderConfig(section ? section.working : defaultHeaderConfig(), false).value,
      published: section?.published ? normalizeHeaderConfig(section.published, false).value : null,
      global: { hasLogo: Number(settingsRow?.hasLogo ?? 0) === 1, src: globalLogoUrl(Number(settingsRow?.hasLogo ?? 0) === 1, settingsRow?.updatedAt) },
      siteName: chrome.settings.siteName,
      navigation: chrome.navigation,
    });
  } catch (reason) {
    return accessErrorResponse(reason, "Pengaturan header belum dapat dimuat.");
  }
}

/** Simpan Draft logo header. Website tidak berubah sampai Publish. */
export async function PUT(request: Request) {
  try {
    const user = await requireKetua();
    let input: Record<string, unknown> = {};
    try { input = await request.json(); } catch { input = {}; }
    const { value, errors } = normalizeHeaderConfig(input.config, true);
    if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });
    const existing = await getChromeSectionForAdmin("header");
    if (value.logo.mode === "custom" && !existing?.hasImage) {
      return Response.json({ error: "Unggah logo khusus header terlebih dahulu, atau pilih Logo Utama." }, { status: 400 });
    }
    const json = JSON.stringify(value);
    if (existing) await setPublicSiteSectionContent(existing.id, json, user.id);
    else await createChromeSection("header", json, user.id);
    const section = await getChromeSectionForAdmin("header");
    return Response.json({ success: true, status: section?.status, hasUnpublishedChanges: section?.hasUnpublishedChanges ?? false });
  } catch (reason) {
    return accessErrorResponse(reason, "Draft header belum dapat disimpan.");
  }
}

/** Publish / tarik dari publik (kembali ke Logo Utama). */
export async function PATCH(request: Request) {
  try {
    const user = await requireKetua();
    let input: Record<string, unknown> = {};
    try { input = await request.json(); } catch { input = {}; }
    const section = await getChromeSectionForAdmin("header");
    if (!section) return Response.json({ error: "Simpan draft header terlebih dahulu." }, { status: 404 });
    if (input.action === "publish") {
      const { value, errors } = normalizeHeaderConfig(section.working, true);
      if (errors.length) return Response.json({ error: `Draft belum valid: ${errors[0]}`, errors }, { status: 400 });
      if (value.logo.mode === "custom" && !section.hasImage) return Response.json({ error: "Draft memakai logo khusus tetapi file logo belum ada." }, { status: 400 });
      await setPublicSiteSectionStatus(section.id, "published", user.id);
    } else if (input.action === "unpublish") {
      await setPublicSiteSectionStatus(section.id, "draft", user.id);
    } else {
      return Response.json({ error: "Aksi tidak valid." }, { status: 400 });
    }
    const next = await getChromeSectionForAdmin("header");
    return Response.json({ success: true, status: next?.status, publishedAt: next?.publishedAt });
  } catch (reason) {
    return accessErrorResponse(reason, "Status header belum dapat diperbarui.");
  }
}
