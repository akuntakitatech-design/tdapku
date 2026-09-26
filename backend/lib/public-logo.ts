/*
 * LOGO WEBSITE PUBLIK — logika MURNI (tanpa DB), dipakai server (resolusi live) & client (editor/preview).
 *
 * Konsep: GLOBAL BRAND LOGO + OPTIONAL HEADER / FOOTER OVERRIDE (tanpa perubahan skema).
 * - Logo Utama  : public_site_settings.logo_key (kolom existing). Berlaku langsung (Pengaturan Website).
 * - Header      : public_site_sections section_key "header" → content_json { logo: { mode, alt, size } } + image_key
 *                 (logo khusus header). Draft → Preview → Publish memakai snapshot publish existing.
 * - Footer      : Footer Builder (section_key "footer") → identity.logoMode + image_key (logo khusus footer).
 * Yang disimpan hanya MODE (inherit/custom). Mode inherit TIDAK menyalin logo utama → saat Logo Utama diganti,
 * Header/Footer yang inherit otomatis ikut berubah.
 *
 * Urutan fallback (dirender berurutan oleh <BrandLogo>; gambar gagal dimuat → sumber berikutnya):
 *   1. logo khusus (bila mode custom & file ada) → 2. Logo Utama (bila ada) → 3. logo statis TDA (safety net).
 */

/** Logo statis teroptimasi (WebP 480×212, ±19 KB) — hanya jaring pengaman, bukan sumber utama. */
export const STATIC_LOGO_SRC = "/tda-pekanbaru-logo.webp";
export const HEADER_SECTION_KEY = "header";

export type LogoMode = "inherit" | "custom";
export type LogoSize = "sm" | "md" | "lg";
export type ResolvedLogo = { sources: string[]; alt: string; size: LogoSize };

export const LOGO_SIZES: { value: LogoSize; label: string }[] = [
  { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" },
];
export const LOGO_ALT_MAX = 120;
export const LOGO_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const LOGO_UPLOAD_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

/** Mode lama Footer Builder ("default"/"uploaded") dipetakan ke inherit/custom agar data lama tetap terbaca. */
export function normalizeLogoMode(value: unknown): LogoMode {
  return value === "custom" || value === "uploaded" ? "custom" : "inherit";
}

/** Daftar sumber berurutan tanpa duplikat; logo statis selalu menjadi sumber terakhir. */
export function logoSources(customSrc: string | null | undefined, globalSrc: string | null | undefined): string[] {
  return [customSrc, globalSrc, STATIC_LOGO_SRC].filter((src, index, list): src is string =>
    typeof src === "string" && src.length > 0 && list.indexOf(src) === index);
}

/** URL publik Logo Utama (versi = updated_at settings agar cache pecah saat logo diganti). */
export function globalLogoUrl(hasLogo: boolean, version: string | null | undefined) {
  if (!hasLogo) return null;
  const v = String(version || "").replace(/\D/g, "").slice(0, 14);
  return v ? `/api/public-site/logo?v=${v}` : "/api/public-site/logo";
}

export type HeaderConfig = { version: 1; logo: { mode: LogoMode; alt: string; size: LogoSize } };

export function defaultHeaderConfig(): HeaderConfig {
  return { version: 1, logo: { mode: "inherit", alt: "", size: "md" } };
}

const obj = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

/** strict = true (Simpan/Publish) → error dikumpulkan & payload ditolak; false (baca LIVE) → nilai tidak valid diganti default. */
export function normalizeHeaderConfig(raw: unknown, strict: boolean): { value: HeaderConfig; errors: string[] } {
  const errors: string[] = [];
  const logo = obj(obj(raw).logo);
  let alt = typeof logo.alt === "string" ? logo.alt.replace(/[\r\n]+/g, " ").trim() : "";
  if (alt.length > LOGO_ALT_MAX) {
    if (strict) errors.push(`Alt text logo maksimal ${LOGO_ALT_MAX} karakter.`);
    alt = alt.slice(0, LOGO_ALT_MAX);
  }
  const size = (["sm", "md", "lg"] as const).includes(logo.size as LogoSize) ? (logo.size as LogoSize) : "md";
  return { value: { version: 1, logo: { mode: normalizeLogoMode(logo.mode), alt, size } }, errors };
}

/** Logo header siap render. `customSrc` hanya diisi bila section header live punya file logo khusus. */
export function resolveHeaderLogo(config: HeaderConfig | null, siteName: string, customSrc: string | null, globalSrc: string | null): ResolvedLogo {
  const c = config ?? defaultHeaderConfig();
  return {
    sources: logoSources(c.logo.mode === "custom" ? customSrc : null, globalSrc),
    alt: c.logo.alt || `Logo ${siteName || "TDA Pekanbaru"}`,
    size: c.logo.size,
  };
}
