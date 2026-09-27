/*
 * CTA HEADER (tombol utama di Header publik, desktop & menu mobile) — logika MURNI, dipakai bersama oleh:
 * - server: db/public-homepage.ts (header live) & route admin /api/public-site/admin/header-cta (validasi)
 * - client: editor Website Publik → Navigasi (form + Preview lokal)
 * Penyimpanan: public_site_sections section_key "header", content_json.cta { label, url, isActive } — TANPA kolom/tabel baru.
 * Berlaku langsung (seperti item Navigasi), terpisah dari Draft/Publish logo header.
 */
import { validateNavigationHref } from "@/lib/public-navigation";

export type HeaderCtaConfig = { label: string; url: string; isActive: boolean };
export type HeaderCtaLink = { label: string; href: string };

/** Pendaftaran Member Baru & Kelas Reguler = route existing /member (MembershipRegistration). */
export const MEMBER_REGISTRATION_PATH = "/member";
/** /form/member = Profil Usaha & Testimoni Member (member existing) — BUKAN pendaftaran member baru. */
export const MEMBER_PROFILE_FORM_PATH = "/form/member";

/** Fallback aman bila CTA belum pernah diatur dari backend. */
export const HEADER_CTA_DEFAULT: HeaderCtaConfig = { label: "Gabung TDA", url: MEMBER_REGISTRATION_PATH, isActive: true };
export const HEADER_CTA_LABEL_MAX = 40;

/** Anchor section lama yang sudah tidak ada di homepage → dialihkan ke tujuan yang benar (render-time, data tidak diubah). */
const OBSOLETE_ANCHORS: Record<string, string> = { "#join": MEMBER_REGISTRATION_PATH };

export function replaceObsoleteHref(href: string): string {
  const key = href.trim().toLowerCase();
  return OBSOLETE_ANCHORS[key] ?? OBSOLETE_ANCHORS[key.replace(/^\/(?=#)/, "")] ?? href;
}

export function isObsoleteAnchor(href: string) {
  return replaceObsoleteHref(href) !== href;
}

export function validateHeaderCta(input: Record<string, unknown>):
  | { ok: true; value: HeaderCtaConfig }
  | { ok: false; errors: Partial<Record<keyof HeaderCtaConfig, string>> } {
  const errors: Partial<Record<keyof HeaderCtaConfig, string>> = {};
  const label = typeof input.label === "string" ? input.label.replace(/\s+/g, " ").trim() : "";
  if (!label) errors.label = "Label CTA wajib diisi.";
  else if (label.length > HEADER_CTA_LABEL_MAX) errors.label = `Label CTA maksimal ${HEADER_CTA_LABEL_MAX} karakter.`;
  const rawUrl = typeof input.url === "string" ? input.url.trim() : "";
  let url = "";
  if (rawUrl && isObsoleteAnchor(rawUrl)) {
    errors.url = `Link ${rawUrl} sudah tidak dipakai. Gunakan ${MEMBER_REGISTRATION_PATH} untuk pendaftaran member.`;
  } else {
    const href = validateNavigationHref(rawUrl);
    if (!href.ok) errors.url = href.error;
    else url = href.href;
  }
  if (typeof input.isActive !== "boolean") errors.isActive = "Status aktif CTA tidak valid.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { label, url, isActive: input.isActive === true } };
}

/** Normalisasi lenient untuk data tersimpan (payload DB tidak dipercaya). Tidak valid → null (pakai default). */
export function readHeaderCta(raw: unknown): HeaderCtaConfig | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const result = validateHeaderCta(raw as Record<string, unknown>);
  return result.ok ? result.value : null;
}

/** CTA final untuk Header publik & Preview. null = CTA dinonaktifkan admin → tombol tidak tampil. */
export function resolveHeaderCta(config: HeaderCtaConfig | null): HeaderCtaLink | null {
  const c = config ?? HEADER_CTA_DEFAULT;
  if (!c.isActive) return null;
  return { label: c.label, href: replaceObsoleteHref(c.url) };
}
