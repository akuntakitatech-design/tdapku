import { env } from "@/lib/runtime-env";

function db() {
  if (!env.DB) throw new Error("Database belum tersedia");
  return env.DB;
}

export type PublicSiteSettings = {
  id: number;
  siteName: string;
  siteTagline: string;
  siteDescription: string;
  contactWhatsapp: string;
  contactEmail: string;
  address: string;
  instagramUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
  tiktokUrl: string;
  footerText: string;
  seoTitle: string;
  seoDescription: string;
};

export type PublicSiteSection = {
  id: number;
  sectionKey: string;
  sectionType: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  contentJson: string;
  status: "draft" | "published" | "archived";
  isVisible: number;
  sortOrder: number;
  publishedAt: string | null;
};

export type PublicNavigationItem = {
  id: number;
  location: "header" | "footer";
  label: string;
  href: string;
  parentId: number | null;
  sortOrder: number;
  isActive: number;
};


export async function getPublicSiteSettings() {
  return db()
    .prepare(`
      SELECT
        id,
        site_name AS siteName,
        site_tagline AS siteTagline,
        site_description AS siteDescription,
        contact_whatsapp AS contactWhatsapp,
        contact_email AS contactEmail,
        address,
        instagram_url AS instagramUrl,
        youtube_url AS youtubeUrl,
        linkedin_url AS linkedinUrl,
        tiktok_url AS tiktokUrl,
        footer_text AS footerText,
        seo_title AS seoTitle,
        seo_description AS seoDescription
      FROM public_site_settings
      WHERE id = 1
      LIMIT 1
    `)
    .first<PublicSiteSettings>();
}

/*
 * Draft → Preview → Publish TANPA perubahan skema:
 * - Kolom section (eyebrow, title, body, CTA, image_key, content_json) = WORKING COPY (draft) yang diedit admin.
 * - Saat Publish, working copy disalin menjadi snapshot `content_json.__published`.
 * - Website publik membaca snapshot tersebut (fallback ke kolom untuk section lama yang published sebelum fitur ini).
 * - is_visible & sort_order adalah konfigurasi tampilan → langsung berlaku di publik.
 */
export const PUBLISHED_SNAPSHOT_KEY = "__published";

export type PublishedSnapshot = {
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaUrl: string;
  imageKey: string | null;
  imageType: string | null;
  content: Record<string, unknown>;
  publishedAt: string;
};

type SectionRow = PublicSiteSection & { imageKey: string | null; imageType: string | null };

function parseContent(raw: string | null | undefined): Record<string, unknown> {
  try {
    const value = JSON.parse(raw || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function withoutSnapshot(content: Record<string, unknown>) {
  const rest = { ...content };
  delete rest[PUBLISHED_SNAPSHOT_KEY];
  return rest;
}

function readSnapshot(content: Record<string, unknown>): PublishedSnapshot | null {
  const value = content[PUBLISHED_SNAPSHOT_KEY];
  return value && typeof value === "object" ? (value as PublishedSnapshot) : null;
}

function workingSnapshot(row: SectionRow, publishedAt: string): PublishedSnapshot {
  return {
    eyebrow: row.eyebrow,
    title: row.title,
    subtitle: row.subtitle,
    body: row.body,
    primaryCtaLabel: row.primaryCtaLabel,
    primaryCtaUrl: row.primaryCtaUrl,
    secondaryCtaLabel: row.secondaryCtaLabel,
    secondaryCtaUrl: row.secondaryCtaUrl,
    imageKey: row.imageKey,
    imageType: row.imageType,
    content: withoutSnapshot(parseContent(row.contentJson)),
    publishedAt,
  };
}

function sameContent(a: PublishedSnapshot, b: PublishedSnapshot) {
  const pick = (s: PublishedSnapshot) => JSON.stringify([s.eyebrow, s.title, s.subtitle, s.body, s.primaryCtaLabel, s.primaryCtaUrl,
    s.secondaryCtaLabel, s.secondaryCtaUrl, s.imageKey, s.content]);
  return pick(a) === pick(b);
}

const SECTION_COLUMNS = `
  id, section_key AS sectionKey, section_type AS sectionType, eyebrow, title, subtitle, body,
  primary_cta_label AS primaryCtaLabel, primary_cta_url AS primaryCtaUrl,
  secondary_cta_label AS secondaryCtaLabel, secondary_cta_url AS secondaryCtaUrl,
  content_json AS contentJson, status, is_visible AS isVisible, sort_order AS sortOrder,
  published_at AS publishedAt, image_key AS imageKey, image_type AS imageType`;

async function readSectionRows(where = "", values: (string | number)[] = []) {
  return (
    await db().prepare(`SELECT ${SECTION_COLUMNS} FROM public_site_sections ${where} ORDER BY sort_order, id`).bind(...values).all<SectionRow>()
  ).results;
}

export type AdminPublicSiteSection = PublicSiteSection & { hasImage: boolean; hasUnpublishedChanges: boolean };

/**
 * publishedOnly = true  → konten LIVE (snapshot publish) untuk section published + visible.
 * publishedOnly = false → working copy untuk backoffice/preview (snapshot tidak dikirim).
 * Kunci objek R2 tidak pernah dikembalikan; hanya flag hasImage.
 */
export async function listPublicSiteSections(publishedOnly = false): Promise<AdminPublicSiteSection[]> {
  const rows = await readSectionRows(publishedOnly ? "WHERE status = 'published' AND is_visible = 1" : "");
  return rows.map(({ imageKey, imageType: _imageType, ...row }) => {
    void _imageType;
    const content = parseContent(row.contentJson);
    const snapshot = readSnapshot(content);
    if (publishedOnly) {
      const live = snapshot ?? workingSnapshot({ ...row, imageKey, imageType: null }, row.publishedAt || "");
      return {
        ...row,
        eyebrow: live.eyebrow, title: live.title, subtitle: live.subtitle, body: live.body,
        primaryCtaLabel: live.primaryCtaLabel, primaryCtaUrl: live.primaryCtaUrl,
        secondaryCtaLabel: live.secondaryCtaLabel, secondaryCtaUrl: live.secondaryCtaUrl,
        contentJson: JSON.stringify(live.content ?? {}),
        hasImage: Boolean(live.imageKey),
        hasUnpublishedChanges: false,
      };
    }
    const working = workingSnapshot({ ...row, imageKey, imageType: null }, "");
    return {
      ...row,
      contentJson: JSON.stringify(withoutSnapshot(content)),
      hasImage: Boolean(imageKey),
      hasUnpublishedChanges: row.status === "published" && Boolean(snapshot) && !sameContent(snapshot as PublishedSnapshot, working),
    };
  });
}

/** Kunci gambar LIVE untuk endpoint gambar publik (hanya section published + visible). */
export async function getLiveSectionImage(sectionKey: string, slot: "main" | "hero" | "program", index: number) {
  const [row] = await readSectionRows("WHERE section_key = ? AND status = 'published' AND is_visible = 1", [sectionKey]);
  if (!row) return null;
  const content = parseContent(row.contentJson);
  const live = readSnapshot(content) ?? workingSnapshot(row, row.publishedAt || "");
  if (slot === "main") return live.imageKey ? { key: live.imageKey, type: live.imageType } : null;
  const list = slot === "hero" ? live.content.heroImages : live.content.programs;
  const item = Array.isArray(list) ? (list[index] as Record<string, unknown> | undefined) : undefined;
  const key = slot === "hero" ? item?.key : item?.imageKey;
  const type = slot === "hero" ? item?.type : item?.imageType;
  return typeof key === "string" && key ? { key, type: typeof type === "string" ? type : null } : null;
}


export async function listPublicNavigation(
  location?: "header" | "footer",
  activeOnly = false,
) {
  const filters: string[] = [];
  const values: unknown[] = [];

  if (location) {
    filters.push("location = ?");
    values.push(location);
  }

  if (activeOnly) {
    filters.push("is_active = 1");
  }

  const where = filters.length
    ? `WHERE ${filters.join(" AND ")}`
    : "";

  const statement = db().prepare(`
    SELECT
      id,
      location,
      label,
      href,
      parent_id AS parentId,
      sort_order AS sortOrder,
      is_active AS isActive
    FROM public_navigation_items
    ${where}
    ORDER BY sort_order, id
  `);

  return (
    await (
      values.length
        ? statement.bind(...values)
        : statement
    ).all<PublicNavigationItem>()
  ).results;
}

/*
 * CRUD Navigasi (Website 02A) — HANYA menyentuh tabel public_navigation_items, satu baris per aksi.
 * Tanpa schema baru: is_active = 1 → tampil publik, 0 → tidak tampil. parent_id tidak diubah editor.
 */
export async function getPublicNavigationItem(id: number) {
  return db()
    .prepare(`
      SELECT id, location, label, href, parent_id AS parentId, sort_order AS sortOrder, is_active AS isActive
      FROM public_navigation_items WHERE id = ? LIMIT 1
    `)
    .bind(id)
    .first<PublicNavigationItem>();
}

type NavigationWrite = { location: "header" | "footer"; label: string; href: string; sortOrder: number; isActive: boolean };

export async function createPublicNavigationItem(input: NavigationWrite, userId: number) {
  const result = await db()
    .prepare(`
      INSERT INTO public_navigation_items
        (location, label, href, parent_id, sort_order, is_active, created_by_user_id, updated_by_user_id)
      VALUES (?, ?, ?, NULL, ?, ?, ?, ?)
    `)
    .bind(input.location, input.label, input.href, input.sortOrder, input.isActive ? 1 : 0, userId, userId)
    .run();
  return Number(result.meta.last_row_id);
}

export async function updatePublicNavigationItem(id: number, input: NavigationWrite, userId: number) {
  await db()
    .prepare(`
      UPDATE public_navigation_items SET
        location = ?, label = ?, href = ?, sort_order = ?, is_active = ?,
        updated_by_user_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `)
    .bind(input.location, input.label, input.href, input.sortOrder, input.isActive ? 1 : 0, userId, id)
    .run();
}

export async function setPublicNavigationItemActive(id: number, isActive: boolean, userId: number) {
  await db()
    .prepare(`UPDATE public_navigation_items SET is_active = ?, updated_by_user_id = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(isActive ? 1 : 0, userId, id)
    .run();
}

/** Hanya menghapus item menu (bukan halaman tujuan). Route admin menolak bila item masih punya sub-menu. */
export async function deletePublicNavigationItem(id: number) {
  await db().prepare(`DELETE FROM public_navigation_items WHERE id = ?`).bind(id).run();
}

export async function updatePublicSiteSettings(
  input: Omit<PublicSiteSettings, "id">,
  userId: number,
) {
  await db()
    .prepare(`
      UPDATE public_site_settings SET
        site_name = ?,
        site_tagline = ?,
        site_description = ?,
        contact_whatsapp = ?,
        contact_email = ?,
        address = ?,
        instagram_url = ?,
        youtube_url = ?,
        linkedin_url = ?,
        tiktok_url = ?,
        footer_text = ?,
        seo_title = ?,
        seo_description = ?,
        updated_by_user_id = ?,
        updated_at = datetime('now')
      WHERE id = 1
    `)
    .bind(
      input.siteName,
      input.siteTagline,
      input.siteDescription,
      input.contactWhatsapp,
      input.contactEmail,
      input.address,
      input.instagramUrl,
      input.youtubeUrl,
      input.linkedinUrl,
      input.tiktokUrl,
      input.footerText,
      input.seoTitle,
      input.seoDescription,
      userId,
    )
    .run();
}

export async function savePublicSiteSection(
  sectionKey: string,
  title: string,
  body: string,
  sortOrder: number,
  userId: number,
) {
  const existing = await db()
    .prepare("SELECT id FROM public_site_sections WHERE section_key = ?")
    .bind(sectionKey)
    .first<{ id: number }>();

  if (existing) {
    await db()
      .prepare(`
        UPDATE public_site_sections
        SET title = ?, body = ?, sort_order = ?,
            updated_by_user_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `)
      .bind(title, body, sortOrder, userId, existing.id)
      .run();
    return existing.id;
  }

  const result = await db()
    .prepare(`
      INSERT INTO public_site_sections
      (section_key, title, body, sort_order, created_by_user_id, updated_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .bind(sectionKey, title, body, sortOrder, userId, userId)
    .run();

  return Number(result.meta.last_row_id);
}

export async function setPublicSiteSectionStatus(
  id: number,
  status: "draft" | "published" | "archived",
  userId: number,
) {
  const [row] = await readSectionRows("WHERE id = ?", [id]);
  if (!row) return;
  const content = withoutSnapshot(parseContent(row.contentJson));
  if (status === "published") {
    // Publish = salin working copy saat ini menjadi snapshot live.
    content[PUBLISHED_SNAPSHOT_KEY] = workingSnapshot(row, new Date().toISOString());
  }
  // Draft/Archived: snapshot dilepas → section tidak lagi tampil di publik (query publik hanya status published).
  await db()
    .prepare(`
      UPDATE public_site_sections
      SET status = ?,
          content_json = ?,
          published_at = CASE
            WHEN ? = 'published' THEN datetime('now')
            ELSE published_at
          END,
          updated_by_user_id = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `)
    .bind(status, JSON.stringify(content), status, userId, id)
    .run();
}

/**
 * Pertahankan snapshot live saat working copy ditimpa editor/rute gambar.
 * Section yang sudah published SEBELUM fitur snapshot (belum punya `__published`) dibekukan dulu
 * dari nilai kolom saat ini, sehingga perubahan berikutnya tetap draft dan tidak langsung live.
 */
async function preserveSnapshot(id: number, nextContentJson: string) {
  const [current] = await readSectionRows("WHERE id = ?", [id]);
  const currentContent = parseContent(current?.contentJson);
  const snapshot = readSnapshot(currentContent)
    ?? (current?.status === "published" ? workingSnapshot(current, current.publishedAt || "") : null);
  const next = withoutSnapshot(parseContent(nextContentJson));
  if (snapshot) next[PUBLISHED_SNAPSHOT_KEY] = snapshot;
  return JSON.stringify(next);
}

export async function updatePublicSiteSection(
  id: number,
  input: {
    eyebrow: string;
    title: string;
    subtitle: string;
    body: string;
    contentJson: string;
    primaryCtaLabel: string;
    primaryCtaUrl: string;
    secondaryCtaLabel: string;
    secondaryCtaUrl: string;
    sortOrder: number;
    isVisible: number;
  },
  userId: number,
) {
  const contentJson = await preserveSnapshot(id, input.contentJson);
  await db()
    .prepare(`
      UPDATE public_site_sections SET
        eyebrow = ?,
        title = ?,
        subtitle = ?,
        body = ?,
        content_json = ?,
        primary_cta_label = ?,
        primary_cta_url = ?,
        secondary_cta_label = ?,
        secondary_cta_url = ?,
        sort_order = ?,
        is_visible = ?,
        updated_by_user_id = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `)
    .bind(
      input.eyebrow,
      input.title,
      input.subtitle,
      input.body,
      contentJson,
      input.primaryCtaLabel,
      input.primaryCtaUrl,
      input.secondaryCtaLabel,
      input.secondaryCtaUrl,
      input.sortOrder,
      input.isVisible,
      userId,
      id,
    )
    .run();
}

export async function getPublicSiteSectionImage(id: number) {
  return db()
    .prepare(`
      SELECT image_key AS imageKey,
             image_name AS imageName,
             image_type AS imageType
      FROM public_site_sections
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first<{
      imageKey: string | null;
      imageName: string | null;
      imageType: string | null;
    }>();
}

export async function setPublicSiteSectionImage(
  id: number,
  key: string,
  name: string,
  type: string,
  userId: number,
) {
  // Ganti gambar = perubahan working copy; snapshot live dibekukan/dipertahankan.
  const [current] = await readSectionRows("WHERE id = ?", [id]);
  const contentJson = await preserveSnapshot(id, JSON.stringify(withoutSnapshot(parseContent(current?.contentJson))));
  await db()
    .prepare(`
      UPDATE public_site_sections
      SET image_key = ?,
          image_name = ?,
          image_type = ?,
          content_json = ?,
          updated_by_user_id = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `)
    .bind(key, name, type, contentJson, userId, id)
    .run();
}

export async function getPublicSiteSectionContent(id: number) {
  return db()
    .prepare(`
      SELECT section_key AS sectionKey, content_json AS contentJson
      FROM public_site_sections
      WHERE id = ?
      LIMIT 1
    `)
    .bind(id)
    .first<{ sectionKey: string; contentJson: string }>();
}

export async function setPublicSiteSectionContent(
  id: number,
  contentJson: string,
  userId: number,
) {
  const merged = await preserveSnapshot(id, contentJson);
  await db()
    .prepare(`
      UPDATE public_site_sections
      SET content_json = ?,
          updated_by_user_id = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `)
    .bind(merged, userId, id)
    .run();
}
