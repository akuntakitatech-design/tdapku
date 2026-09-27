/*
 * FOOTER BUILDER (major visual revision) — logika MURNI (tanpa DB), dipakai bersama oleh:
 * - server: route admin footer (validasi ketat saat Simpan Draft & Publish) dan db/public-homepage.ts (baca LIVE)
 * - client: editor Footer Builder (validasi form + Preview desktop/mobile)
 * Penyimpanan: public_site_sections section_key = "footer" → content_json (working copy) + snapshot publish existing.
 * Kontak/sosial/identitas default MEWARISI public_site_settings (sourceMode "settings"); nilai custom hanya dipakai
 * bila admin sengaja memilih "custom". Telepon & Facebook (tidak ada di settings) selalu dari konfigurasi footer.
 */
import { safeHref, whatsappDigits } from "@/lib/public-site-content";
import { validateNavigationHref } from "@/lib/public-navigation";
import type { PublicCta, PublicHomepage } from "@/db/public-homepage";
import { logoSources, normalizeLogoMode, type LogoMode } from "@/lib/public-logo";

export const FOOTER_SECTION_KEY = "footer";
export const FOOTER_LIMITS = {
  columns: 6, itemsPerColumn: 10, bottomLinks: 8, label: 60, title: 60, url: 500,
  name: 80, tagline: 120, description: 400, hashtag: 40, ctaTitle: 90, ctaDescription: 240, buttonLabel: 40,
  copyright: 160, address: 300, phone: 30, email: 120,
} as const;
export const SOCIAL_PLATFORMS = ["instagram", "youtube", "linkedin", "tiktok", "facebook"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export const SOCIAL_LABELS: Record<SocialPlatform, string> = { instagram: "Instagram", youtube: "YouTube", linkedin: "LinkedIn", tiktok: "TikTok", facebook: "Facebook" };
/** Platform yang punya field di public_site_settings (bisa diwarisi). Facebook hanya custom. */
export const SOCIAL_IN_SETTINGS: SocialPlatform[] = ["instagram", "youtube", "linkedin", "tiktok"];
export const CONTACT_KEYS = ["whatsapp", "email", "phone", "address", "maps"] as const;
export type ContactKey = (typeof CONTACT_KEYS)[number];

export type SourceMode = "settings" | "custom";
export type FooterLayout = 3 | 4 | 5;
export type FooterTheme = "deep-navy" | "indigo-gradient" | "light";
export type FooterMotif = "none" | "pucuk-rebung" | "selembayung";
export type MotifIntensity = "subtle" | "medium";

export type FooterLink = { id: string; label: string; url: string; linkType: "internal" | "external"; openNewTab: boolean; isVisible: boolean; sortOrder: number };
export type FooterColumn = { id: string; title: string; isVisible: boolean; sortOrder: number; items: FooterLink[] };
export type FooterConfig = {
  version: 1;
  /** logoMode: "inherit" = Logo Utama Website (runtime, tanpa salinan) · "custom" = logo khusus footer (image_key section footer). */
  identity: { isVisible: boolean; showLogo: boolean; logoMode: LogoMode; sourceMode: SourceMode; organizationName: string; tagline: string; description: string; hashtag: string };
  columns: FooterColumn[];
  contact: { isVisible: boolean; title: string; sourceMode: SourceMode; whatsapp: string; email: string; phone: string; address: string; mapsUrl: string; show: Record<ContactKey, boolean> };
  social: { isVisible: boolean; sourceMode: SourceMode; items: { platform: SocialPlatform; url: string; isVisible: boolean; sortOrder: number }[] };
  cta: { isVisible: boolean; title: string; description: string; buttonLabel: string; buttonUrl: string };
  bottomBar: { isVisible: boolean; copyright: string; links: FooterLink[] };
  appearance: { layout: FooterLayout; theme: FooterTheme; motif: FooterMotif; motifIntensity: MotifIntensity };
};

export const FOOTER_THEMES: { value: FooterTheme; label: string }[] = [
  { value: "deep-navy", label: "Deep Navy" }, { value: "indigo-gradient", label: "Indigo Gradient" }, { value: "light", label: "Light" },
];
export const FOOTER_MOTIFS: { value: FooterMotif; label: string }[] = [
  { value: "none", label: "Tanpa motif" }, { value: "pucuk-rebung", label: "Pucuk Rebung" }, { value: "selembayung", label: "Selembayung" },
];

const link = (id: string, label: string, url: string, sortOrder: number): FooterLink =>
  ({ id, label, url, linkType: /^https?:\/\//i.test(url) ? "external" : "internal", openNewTab: false, isVisible: true, sortOrder });

/** Konfigurasi awal editor saat footer belum pernah disimpan (belum ditulis ke DB sampai admin menekan Simpan Draft). */
export function defaultFooterConfig(): FooterConfig {
  return {
    version: 1,
    identity: { isVisible: true, showLogo: true, logoMode: "inherit", sourceMode: "settings", organizationName: "", tagline: "", description: "", hashtag: "#RiangGembira" },
    columns: [
      { id: "jelajahi", title: "Jelajahi", isVisible: true, sortOrder: 10, items: [link("profil", "Profil", "/tentang", 10), link("program", "Program", "/program", 20), link("kalender", "Kalender", "/kalender", 30)] },
      { id: "komunitas", title: "Komunitas", isVisible: true, sortOrder: 20, items: [link("gabung", "Gabung TDA", "/member", 10), link("profil-usaha", "Profil Usaha & Testimoni", "/form/member", 20)] },
    ],
    contact: { isVisible: true, title: "Hubungi Kami", sourceMode: "settings", whatsapp: "", email: "", phone: "", address: "", mapsUrl: "", show: { whatsapp: true, email: true, phone: false, address: true, maps: true } },
    social: { isVisible: true, sourceMode: "settings", items: SOCIAL_PLATFORMS.map((platform, index) => ({ platform, url: "", isVisible: platform !== "facebook", sortOrder: (index + 1) * 10 })) },
    cta: { isVisible: true, title: "Siap Bertumbuh Bersama TDA?", description: "Bergabung dengan komunitas pengusaha Pekanbaru untuk belajar, berjejaring, dan naik kelas bersama.", buttonLabel: "Gabung TDA", buttonUrl: "/member" },
    bottomBar: { isVisible: true, copyright: "© {year} TDA Pekanbaru. Seluruh hak cipta dilindungi.", links: [] },
    appearance: { layout: 4, theme: "deep-navy", motif: "selembayung", motifIntensity: "subtle" },
  };
}

// ---------------------------------------------------------------- validasi / normalisasi
const EMAIL_RE = /^[^\s@<>()"']+@[^\s@<>()"']+\.[A-Za-z]{2,}$/;
const PHONE_RE = /^\+?[0-9 ()-]{6,30}$/;
const ID_RE = /^[a-z0-9-]{1,40}$/;
const obj = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
const oneOf = <T extends string | number>(value: unknown, options: readonly T[], fallback: T): T => (options.includes(value as T) ? (value as T) : fallback);

type Ctx = { strict: boolean; errors: string[] };
function str(ctx: Ctx, value: unknown, max: number, path: string) {
  const text = typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";
  if (text.length > max) {
    ctx.errors.push(`${path}: maksimal ${max} karakter.`);
    return text.slice(0, max);
  }
  return text;
}
function sortOf(value: unknown, index: number) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 9999 ? n : (index + 1) * 10;
}
/** URL link footer: internal "/..." atau http(s). Menolak javascript:, data:, //host, dll. Kosong = "" (tidak valid untuk item). */
export function footerUrl(value: unknown): { ok: true; url: string } | { ok: false; error: string } {
  const result = validateNavigationHref(value);
  return result.ok ? { ok: true, url: result.href } : { ok: false, error: result.error };
}
function optionalExternal(ctx: Ctx, value: unknown, path: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  const result = footerUrl(raw);
  if (!result.ok || !/^https:\/\//i.test(result.url)) {
    ctx.errors.push(`${path}: URL harus diawali https:// dan valid.`);
    return "";
  }
  return result.url;
}
function normalizeLinks(ctx: Ctx, list: unknown, max: number, path: string): FooterLink[] {
  const items = arr(list);
  if (items.length > max) ctx.errors.push(`${path}: maksimal ${max} link.`);
  const out: FooterLink[] = [];
  const used = new Set<string>();
  items.slice(0, max).forEach((raw, index) => {
    const item = obj(raw);
    const label = str(ctx, item.label, FOOTER_LIMITS.label, `${path} #${index + 1} label`);
    const url = footerUrl(item.url);
    if (!label) ctx.errors.push(`${path} #${index + 1}: label wajib diisi.`);
    if (!url.ok) ctx.errors.push(`${path} #${index + 1} (${label || "tanpa label"}): ${url.error}`);
    if (!label || !url.ok) return;
    let id = typeof item.id === "string" && ID_RE.test(item.id) ? item.id : `link-${index + 1}`;
    while (used.has(id)) id = `${id}-x`;
    used.add(id);
    out.push({
      id, label, url: url.url, linkType: /^https?:\/\//i.test(url.url) ? "external" : "internal",
      openNewTab: bool(item.openNewTab, false), isVisible: bool(item.isVisible, true), sortOrder: sortOf(item.sortOrder, index),
    });
  });
  return out;
}

/**
 * Normalisasi konfigurasi footer dari payload/DB yang tidak dipercaya.
 * strict = true  → dipakai saat Simpan/Publish: error dikumpulkan dan payload DITOLAK bila ada error.
 * strict = false → dipakai saat membaca LIVE: item tidak valid dibuang diam-diam (website tidak rusak).
 */
export function normalizeFooterConfig(raw: unknown, strict: boolean): { value: FooterConfig; errors: string[] } {
  const ctx: Ctx = { strict, errors: [] };
  const base = defaultFooterConfig();
  const input = obj(raw);

  const identity = obj(input.identity);
  const columnsRaw = arr(input.columns);
  if (columnsRaw.length > FOOTER_LIMITS.columns) ctx.errors.push(`Kolom footer maksimal ${FOOTER_LIMITS.columns}.`);
  const usedColumnIds = new Set<string>();
  const columns: FooterColumn[] = columnsRaw.slice(0, FOOTER_LIMITS.columns).map((rawColumn, index) => {
    const column = obj(rawColumn);
    const title = str(ctx, column.title, FOOTER_LIMITS.title, `Kolom #${index + 1} judul`);
    if (!title) ctx.errors.push(`Kolom #${index + 1}: judul wajib diisi.`);
    let id = typeof column.id === "string" && ID_RE.test(column.id) ? column.id : `kolom-${index + 1}`;
    while (usedColumnIds.has(id)) id = `${id}-x`;
    usedColumnIds.add(id);
    return {
      id, title, isVisible: bool(column.isVisible, true), sortOrder: sortOf(column.sortOrder, index),
      items: normalizeLinks(ctx, column.items, FOOTER_LIMITS.itemsPerColumn, `Kolom "${title || index + 1}"`),
    };
  }).filter((column) => column.title);

  const contact = obj(input.contact);
  const show = obj(contact.show);
  const whatsapp = str(ctx, contact.whatsapp, 30, "WhatsApp custom");
  if (whatsapp && whatsappDigits(whatsapp).length < 9) ctx.errors.push("WhatsApp custom tidak valid (min. 9 digit).");
  const email = str(ctx, contact.email, FOOTER_LIMITS.email, "Email custom");
  if (email && !EMAIL_RE.test(email)) ctx.errors.push("Email custom tidak valid.");
  const phone = str(ctx, contact.phone, FOOTER_LIMITS.phone, "Telepon");
  if (phone && !PHONE_RE.test(phone)) ctx.errors.push("Nomor telepon tidak valid.");

  const social = obj(input.social);
  const seen = new Set<SocialPlatform>();
  const socialItems = arr(social.items).map((rawItem, index) => {
    const item = obj(rawItem);
    const platform = oneOf(item.platform, SOCIAL_PLATFORMS, "instagram");
    if (!SOCIAL_PLATFORMS.includes(item.platform as SocialPlatform) || seen.has(platform)) return null;
    seen.add(platform);
    return { platform, url: optionalExternal(ctx, item.url, SOCIAL_LABELS[platform]), isVisible: bool(item.isVisible, true), sortOrder: sortOf(item.sortOrder, index) };
  }).filter((item): item is FooterConfig["social"]["items"][number] => Boolean(item));
  for (const platform of SOCIAL_PLATFORMS) if (!seen.has(platform)) socialItems.push({ platform, url: "", isVisible: false, sortOrder: 90 + socialItems.length });

  const cta = obj(input.cta);
  const ctaVisible = bool(cta.isVisible, false);
  const ctaTitle = str(ctx, cta.title, FOOTER_LIMITS.ctaTitle, "CTA judul");
  const buttonLabel = str(ctx, cta.buttonLabel, FOOTER_LIMITS.buttonLabel, "CTA label tombol");
  const rawButtonUrl = typeof cta.buttonUrl === "string" ? cta.buttonUrl.trim() : "";
  const buttonUrl = rawButtonUrl ? footerUrl(rawButtonUrl) : null;
  if (buttonUrl && !buttonUrl.ok) ctx.errors.push(`CTA URL tombol: ${buttonUrl.error}`);
  if (ctaVisible && (!ctaTitle || !buttonLabel || !buttonUrl?.ok)) ctx.errors.push("CTA yang ditampilkan wajib memiliki judul, label tombol, dan URL tombol yang valid.");

  const bottom = obj(input.bottomBar);
  const appearance = obj(input.appearance);
  const value: FooterConfig = {
    version: 1,
    identity: {
      isVisible: bool(identity.isVisible, true), showLogo: bool(identity.showLogo, true),
      logoMode: normalizeLogoMode(identity.logoMode),
      sourceMode: oneOf(identity.sourceMode, ["settings", "custom"] as const, "settings"),
      organizationName: str(ctx, identity.organizationName, FOOTER_LIMITS.name, "Nama organisasi"),
      tagline: str(ctx, identity.tagline, FOOTER_LIMITS.tagline, "Tagline"),
      description: str(ctx, identity.description, FOOTER_LIMITS.description, "Deskripsi"),
      hashtag: str(ctx, identity.hashtag, FOOTER_LIMITS.hashtag, "Hashtag"),
    },
    columns,
    contact: {
      isVisible: bool(contact.isVisible, true), title: str(ctx, contact.title, FOOTER_LIMITS.title, "Judul kontak") || base.contact.title,
      sourceMode: oneOf(contact.sourceMode, ["settings", "custom"] as const, "settings"),
      whatsapp: ctx.errors.some((e) => e.startsWith("WhatsApp")) ? "" : whatsapp,
      email: email && EMAIL_RE.test(email) ? email : "",
      phone: phone && PHONE_RE.test(phone) ? phone : "",
      address: str(ctx, contact.address, FOOTER_LIMITS.address, "Alamat custom"),
      mapsUrl: optionalExternal(ctx, contact.mapsUrl, "Google Maps"),
      show: Object.fromEntries(CONTACT_KEYS.map((key) => [key, bool(show[key], base.contact.show[key])])) as Record<ContactKey, boolean>,
    },
    social: { isVisible: bool(social.isVisible, true), sourceMode: oneOf(social.sourceMode, ["settings", "custom"] as const, "settings"), items: socialItems },
    cta: {
      isVisible: ctaVisible && Boolean(ctaTitle && buttonLabel && buttonUrl?.ok),
      title: ctaTitle, description: str(ctx, cta.description, FOOTER_LIMITS.ctaDescription, "CTA deskripsi"),
      buttonLabel, buttonUrl: buttonUrl?.ok ? buttonUrl.url : "",
    },
    bottomBar: {
      isVisible: bool(bottom.isVisible, true), copyright: str(ctx, bottom.copyright, FOOTER_LIMITS.copyright, "Copyright"),
      links: normalizeLinks(ctx, bottom.links, FOOTER_LIMITS.bottomLinks, "Bottom bar"),
    },
    appearance: {
      layout: oneOf(Number(appearance.layout), [3, 4, 5] as const, 4),
      theme: oneOf(appearance.theme, ["deep-navy", "indigo-gradient", "light"] as const, "deep-navy"),
      motif: oneOf(appearance.motif, ["none", "pucuk-rebung", "selembayung"] as const, "selembayung"),
      motifIntensity: oneOf(appearance.motifIntensity, ["subtle", "medium"] as const, "subtle"),
    },
  };
  return { value, errors: ctx.errors };
}

// ---------------------------------------------------------------- resolusi → data siap render
export type ResolvedLink = { label: string; href: string; external: boolean; newTab: boolean };
export type ResolvedFooter = {
  fromBuilder: boolean;
  /** logoSources: urutan fallback (khusus → Logo Utama → statis); [] = logo disembunyikan. */
  brand: { name: string; tagline: string; description: string; hashtag: string; logoSources: string[]; logoPlate: boolean } | null;
  columns: { id: string; title: string; links: ResolvedLink[] }[];
  contact: { title: string; items: { key: ContactKey; label: string; href: string | null; lines?: string[] }[] } | null;
  social: { platform: SocialPlatform; label: string; href: string }[];
  cta: { title: string; description: string; buttonLabel: string; href: string; external: boolean } | null;
  bottom: { copyright: string; links: ResolvedLink[] } | null;
  appearance: FooterConfig["appearance"];
};

const byOrder = <T extends { sortOrder: number }>(list: T[]) => [...list].sort((a, b) => a.sortOrder - b.sortOrder);
const isExternalUrl = (href: string) => /^https?:\/\//i.test(href);
function resolveLink(item: { label: string; url: string; openNewTab?: boolean }): ResolvedLink | null {
  const href = safeHref(item.url);
  if (!href || href === "#" || !footerUrl(href).ok || !item.label) return null;
  const external = isExternalUrl(href);
  return { label: item.label, href, external, newTab: external || Boolean(item.openNewTab) };
}

/**
 * Footer siap render. `config` = konfigurasi PUBLISHED (atau draft untuk preview admin); null = fallback aman
 * (struktur footer lama dari settings + navigasi). `settings` = settings publik yang sudah divalidasi (buildPublicChrome).
 */
export type FooterLogoInput = { customSrc: string | null; globalSrc: string | null };

export function resolveFooter(config: FooterConfig | null, settings: PublicHomepage["settings"], navLinks: PublicCta[], logos: FooterLogoInput = { customSrc: null, globalSrc: null }): ResolvedFooter {
  if (!config) {
    return {
      fromBuilder: false,
      brand: { name: settings.siteName, tagline: settings.siteTagline, description: settings.siteDescription, hashtag: "", logoSources: logoSources(null, logos.globalSrc), logoPlate: true },
      columns: navLinks.length ? [{ id: "jelajahi", title: "Jelajahi", links: navLinks.map((l) => resolveLink({ label: l.label, url: l.href })).filter((l): l is ResolvedLink => Boolean(l)) }] : [],
      contact: resolveContact(defaultFooterConfig().contact, settings),
      social: resolveSocial(defaultFooterConfig().social, settings),
      cta: null,
      bottom: settings.footerText ? { copyright: settings.footerText, links: [] } : null,
      appearance: { layout: 3, theme: "deep-navy", motif: "pucuk-rebung", motifIntensity: "subtle" },
    };
  }
  const id = config.identity;
  const fromSettings = id.sourceMode === "settings";
  const name = (fromSettings ? settings.siteName : id.organizationName) || settings.siteName;
  const brand = id.isVisible ? {
    name,
    tagline: fromSettings ? settings.siteTagline : id.tagline,
    description: fromSettings ? settings.siteDescription : id.description,
    hashtag: id.hashtag,
    logoSources: id.showLogo ? logoSources(id.logoMode === "custom" ? logos.customSrc : null, logos.globalSrc) : [],
    // Logo Utama (berwarna) diberi pelat putih di tema gelap; logo khusus footer (mis. versi putih) tampil apa adanya.
    logoPlate: config.appearance.theme !== "light" && !(id.logoMode === "custom" && logos.customSrc),
  } : null;
  const columns = byOrder(config.columns.filter((c) => c.isVisible)).map((c) => ({
    id: c.id, title: c.title,
    links: byOrder(c.items.filter((i) => i.isVisible)).map(resolveLink).filter((l): l is ResolvedLink => Boolean(l)),
  })).filter((c) => c.links.length);
  const ctaHref = config.cta.isVisible ? safeHref(config.cta.buttonUrl) : null;
  const year = String(new Date().getFullYear());
  const bottomLinks = byOrder(config.bottomBar.links.filter((l) => l.isVisible)).map(resolveLink).filter((l): l is ResolvedLink => Boolean(l));
  const copyright = config.bottomBar.copyright.replace(/\{year\}/g, year);
  return {
    fromBuilder: true,
    brand,
    columns,
    contact: config.contact.isVisible ? resolveContact(config.contact, settings) : null,
    social: config.social.isVisible ? resolveSocial(config.social, settings) : [],
    cta: config.cta.isVisible && ctaHref && ctaHref !== "#" ? { title: config.cta.title, description: config.cta.description, buttonLabel: config.cta.buttonLabel, href: ctaHref, external: isExternalUrl(ctaHref) } : null,
    bottom: config.bottomBar.isVisible && (copyright || bottomLinks.length) ? { copyright, links: bottomLinks } : null,
    appearance: config.appearance,
  };
}

function resolveContact(c: FooterConfig["contact"], s: PublicHomepage["settings"]): ResolvedFooter["contact"] {
  const custom = c.sourceMode === "custom";
  const items: NonNullable<ResolvedFooter["contact"]>["items"] = [];
  const waDigits = custom ? whatsappDigits(c.whatsapp) : "";
  const waHref = custom ? (waDigits.length >= 9 ? `https://wa.me/${waDigits}` : null) : s.whatsappUrl;
  const waLabel = custom ? (c.whatsapp ? `WhatsApp ${c.whatsapp}` : "") : `WhatsApp ${s.whatsappLabel ?? ""}`.trim();
  if (c.show.whatsapp && waHref) items.push({ key: "whatsapp", label: waLabel, href: waHref });
  const email = custom ? c.email : s.email;
  if (c.show.email && email && EMAIL_RE.test(email)) items.push({ key: "email", label: email, href: `mailto:${email}` });
  if (c.show.phone && c.phone && PHONE_RE.test(c.phone)) items.push({ key: "phone", label: c.phone, href: `tel:${c.phone.replace(/[^+0-9]/g, "")}` });
  const lines = custom ? c.address.split("\n").map((l) => l.trim()).filter(Boolean) : s.addressLines;
  if (c.show.address && lines.length) items.push({ key: "address", label: custom ? "Alamat" : s.addressTitle, href: null, lines });
  const maps = c.mapsUrl || (custom ? "" : s.mapsUrl);
  if (c.show.maps && maps && /^https:\/\//i.test(maps)) items.push({ key: "maps", label: "Buka di Google Maps", href: maps });
  return items.length ? { title: c.title, items } : null;
}

function resolveSocial(c: FooterConfig["social"], s: PublicHomepage["settings"]): ResolvedFooter["social"] {
  const fromSettings: Partial<Record<SocialPlatform, string | null>> = { instagram: s.instagramUrl, youtube: s.youtubeUrl, linkedin: s.linkedinUrl, tiktok: s.tiktokUrl };
  return byOrder(c.items.filter((item) => item.isVisible)).map((item) => {
    const url = c.sourceMode === "settings" && SOCIAL_IN_SETTINGS.includes(item.platform) ? fromSettings[item.platform] ?? "" : item.url;
    const href = url && /^https:\/\//i.test(url) && footerUrl(url).ok ? url : null;
    return href ? { platform: item.platform, label: SOCIAL_LABELS[item.platform], href } : null;
  }).filter((item): item is ResolvedFooter["social"][number] => Boolean(item));
}
