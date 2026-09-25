import { env } from "@/lib/runtime-env";
import { getPublicSiteSettings, listPublicNavigation, listPublicSiteSections, type AdminPublicSiteSection } from "@/db/public-site";
import { listPublishedBusinesses, listPublishedTestimonials } from "@/db/public-member-submissions";
import { listPublicMedia, type PublicMediaItem } from "@/db/public-media";
import {
  FALLBACK_CTA, FALLBACK_HEADER_CTA, FALLBACK_HERO, FALLBACK_SITE, IMPACT_FIELDS,
  instagramHandle, safeHref, whatsappDigits, youtubeId,
} from "@/lib/public-site-content";
import { resolvePublicNavigation } from "@/lib/public-navigation";

/*
 * Model homepage publik (READ-ONLY).
 * - Section hanya dari status = 'published' AND is_visible = 1 (versi LIVE/snapshot publish).
 * - Draft/hidden/archived tidak pernah dibaca di sini.
 * - Whitelist field: tidak ada kunci objek R2, metadata admin, user id, audit, atau data privat.
 * - Tidak ada penulisan database.
 */

export type PublicCta = { label: string; href: string };
export type PublicSectionBlock = {
  section: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  primaryCta: PublicCta | null;
  secondaryCta: PublicCta | null;
  image: string | null;
  sortOrder: number;
};
export type PublicSpotlight = { brand: string; owner: string; position: string; category: string; story: string; videoUrl: string };
export type PublicBusiness = {
  id: number; memberName: string; businessName: string; businessCategory: string; businessDescription: string;
  businessLocation: string; hasBusinessPhoto: boolean; hasLogo: boolean;
};
export type PublicTestimonial = { id: number; memberName: string; businessName: string; positionTitle: string; testimonial: string; hasProfilePhoto: boolean };

export type PublicHomepage = {
  settings: {
    siteName: string; siteTagline: string; siteDescription: string; footerText: string;
    email: string | null; whatsappUrl: string | null; whatsappLabel: string | null; instagramUrl: string | null; instagramLabel: string | null;
    youtubeUrl: string | null; linkedinUrl: string | null; tiktokUrl: string | null;
    addressTitle: string; addressLines: string[]; mapsUrl: string;
    seoTitle: string; seoDescription: string;
  };
  navigation: PublicNavigation;
  hero: PublicSectionBlock & { images: { src: string; alt: string }[]; intervalMs: number; fromCms: boolean };
  about: PublicSectionBlock | null;
  impact: (PublicSectionBlock & { stats: { value: string; label: string }[] }) | null;
  spotlight: (PublicSectionBlock & { items: PublicSpotlight[] }) | null;
  directory: (PublicSectionBlock & { items: PublicBusiness[] }) | null;
  testimonials: (PublicSectionBlock & { items: PublicTestimonial[] }) | null;
  cta: PublicSectionBlock & { fromCms: boolean };
  banners: PublicMediaItem[];
  gallery: PublicMediaItem[];
  /** Fallback hardcoded yang masih dipakai (untuk audit/QA; tidak ditampilkan di UI). */
  fallbacksUsed: string[];
};

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

function cta(label: unknown, href: unknown): PublicCta | null {
  const safe = safeHref(href);
  const cleanLabel = text(label);
  return cleanLabel && safe ? { label: cleanLabel, href: safe } : null;
}

function content(section: AdminPublicSiteSection): Record<string, unknown> {
  try {
    const value = JSON.parse(section.contentJson || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function imageUrl(sectionKey: string, slot: "main" | "hero", index: number, version: string | null) {
  const params = new URLSearchParams({ section: sectionKey, slot, index: String(index) });
  if (version) params.set("v", version.replace(/\D/g, "").slice(0, 14));
  return `/api/public-site/image?${params.toString()}`;
}

function block(section: AdminPublicSiteSection): PublicSectionBlock {
  return {
    section: section.sectionKey,
    eyebrow: text(section.eyebrow),
    title: text(section.title),
    subtitle: text(section.subtitle),
    body: text(section.body),
    primaryCta: cta(section.primaryCtaLabel, section.primaryCtaUrl),
    secondaryCta: cta(section.secondaryCtaLabel, section.secondaryCtaUrl),
    image: section.hasImage ? imageUrl(section.sectionKey, "main", 0, section.publishedAt) : null,
    sortOrder: Number(section.sortOrder) || 0,
  };
}

async function memberImageFlags() {
  if (!env.DB) return new Map<number, { logo: boolean; business: boolean; profile: boolean }>();
  const rows = (
    await env.DB.prepare(`
      SELECT id,
        CASE WHEN COALESCE(logo_key, '') <> '' THEN 1 ELSE 0 END AS logo,
        CASE WHEN COALESCE(business_photo_key, '') <> '' THEN 1 ELSE 0 END AS business,
        CASE WHEN COALESCE(profile_photo_key, '') <> '' THEN 1 ELSE 0 END AS profile
      FROM public_member_submissions
      WHERE review_status = 'published' AND (publish_business = 1 OR publish_testimonial = 1)
    `).all<{ id: number; logo: number; business: number; profile: number }>()
  ).results;
  return new Map(rows.map((row) => [Number(row.id), { logo: Number(row.logo) === 1, business: Number(row.business) === 1, profile: Number(row.profile) === 1 }]));
}

export type PublicNavigation = { header: PublicCta[]; footer: PublicCta[]; headerCta: PublicCta };
export type PublicChrome = { settings: PublicHomepage["settings"]; navigation: PublicNavigation; fallbacksUsed: string[] };

const EMAIL_RE = /^[^\s@<>()"']+@[^\s@<>()"']+\.[A-Za-z]{2,}$/;

/**
 * Header/Footer/Navigasi GLOBAL (Website 02) — satu sumber untuk seluruh halaman publik.
 * Sumber: public_site_settings (id=1) + public_navigation_items (is_active = 1, tanpa parent).
 * Kontak divalidasi: nilai tidak valid → null (link tidak dirender). Fallback = nilai lama homepage.
 */
export function buildPublicChrome(
  s: Awaited<ReturnType<typeof getPublicSiteSettings>> | null,
  navRows: Awaited<ReturnType<typeof listPublicNavigation>>,
): PublicChrome {
  const fallbacksUsed: string[] = [];
  const pick = (value: unknown, fallback: string, label: string) => {
    const v = text(value);
    if (v) return v;
    fallbacksUsed.push(label);
    return fallback;
  };
  const wa = whatsappDigits(pick(s?.contactWhatsapp, FALLBACK_SITE.contactWhatsapp, "settings.contactWhatsapp"));
  const waValid = /^[1-9]\d{8,14}$/.test(wa);
  const email = pick(s?.contactEmail, FALLBACK_SITE.contactEmail, "settings.contactEmail");
  const igRaw = safeHref(pick(s?.instagramUrl, FALLBACK_SITE.instagramUrl, "settings.instagramUrl"));
  const social = (value: unknown) => {
    const href = safeHref(value);
    return href && /^https?:\/\//i.test(href) ? href : null;
  };
  const instagramUrl = social(igRaw);
  const cmsAddress = text(s?.address);
  if (!cmsAddress) fallbacksUsed.push("settings.address");
  const addressLines = (cmsAddress || FALLBACK_SITE.address).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  const settings: PublicHomepage["settings"] = {
    siteName: pick(s?.siteName, FALLBACK_SITE.siteName, "settings.siteName"),
    siteTagline: text(s?.siteTagline),
    siteDescription: text(s?.siteDescription),
    footerText: pick(s?.footerText, FALLBACK_SITE.footerText, "settings.footerText"),
    email: EMAIL_RE.test(email) ? email : null,
    whatsappUrl: waValid ? `https://wa.me/${wa}` : null,
    whatsappLabel: waValid ? `+${wa}` : null,
    instagramUrl,
    instagramLabel: instagramUrl ? instagramHandle(instagramUrl) : null,
    youtubeUrl: social(s?.youtubeUrl),
    linkedinUrl: social(s?.linkedinUrl),
    tiktokUrl: social(s?.tiktokUrl),
    addressTitle: FALLBACK_SITE.addressTitle,
    addressLines,
    mapsUrl: cmsAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLines.join(" "))}`
      : FALLBACK_SITE.mapsUrl,
    seoTitle: text(s?.seoTitle),
    seoDescription: text(s?.seoDescription),
  };

  // Navigasi (Website 02A): aturan bersama dengan editor CMS & preview — lib/public-navigation.ts.
  // Hanya is_active = 1, tanpa parent, href aman, urut sort_order ASC, id ASC. Header kosong → fallback existing.
  const nav = resolvePublicNavigation(navRows);
  if (nav.headerFromFallback) fallbacksUsed.push("navigation.header");
  // CTA header: belum ada field CTA di public_site_settings / public_navigation_items (tanpa schema change)
  // → fallback yang disepakati "Gabung TDA" (/form/member).
  fallbacksUsed.push("header.cta");
  if (!nav.footer.length) fallbacksUsed.push("navigation.footer(header-links)");
  return { settings, navigation: { header: nav.header, footer: nav.footer, headerCta: { ...FALLBACK_HEADER_CTA } }, fallbacksUsed };
}

/** Data header/footer global untuk halaman publik selain homepage. Read-only. */
export async function getPublicChrome(): Promise<PublicChrome> {
  const [settingsRow, navRows] = await Promise.all([
    getPublicSiteSettings().catch(() => null),
    listPublicNavigation(undefined, true).catch(() => []),
  ]);
  return buildPublicChrome(settingsRow, navRows);
}

export async function getPublicHomepage(): Promise<PublicHomepage> {
  const fallbacksUsed: string[] = [];
  const [settingsRow, sections, navRows, banners, gallery] = await Promise.all([
    getPublicSiteSettings().catch(() => null),
    listPublicSiteSections(true).catch(() => [] as AdminPublicSiteSection[]),
    listPublicNavigation(undefined, true).catch(() => []),
    listPublicMedia("banner", true).catch(() => [] as PublicMediaItem[]),
    listPublicMedia("gallery", true).catch(() => [] as PublicMediaItem[]),
  ]);
  const live = new Map(sections.map((section) => [section.sectionKey, section]));

  const chrome = buildPublicChrome(settingsRow, navRows);
  fallbacksUsed.push(...chrome.fallbacksUsed);
  const { settings } = chrome;

  // ---------- Hero ----------
  const heroSection = live.get("hero");
  let hero: PublicHomepage["hero"];
  if (heroSection && (text(heroSection.title) || text(heroSection.body))) {
    const c = content(heroSection);
    const list = Array.isArray(c.heroImages) ? c.heroImages : [];
    const interval = Number(c.heroIntervalMs);
    hero = {
      ...block(heroSection),
      images: list
        .map((item, index) => ({ item: item as Record<string, unknown>, index }))
        .filter(({ item }) => typeof item?.key === "string" && item.key)
        .map(({ index }, n) => ({ src: imageUrl("hero", "hero", index, heroSection.publishedAt), alt: `Kegiatan TDA Pekanbaru ${n + 1}` })),
      intervalMs: [3000, 5000, 7000, 10000].includes(interval) ? interval : 5000,
      fromCms: true,
    };
  } else {
    fallbacksUsed.push("section.hero");
    hero = {
      section: "hero", eyebrow: FALLBACK_HERO.eyebrow, title: FALLBACK_HERO.title, subtitle: FALLBACK_HERO.subtitle,
      body: FALLBACK_HERO.body, primaryCta: { ...FALLBACK_HERO.primaryCta }, secondaryCta: { ...FALLBACK_HERO.secondaryCta },
      image: null, sortOrder: 1, images: [], intervalMs: 5000, fromCms: false,
    };
  }

  // ---------- About ----------
  const aboutSection = live.get("about");
  const about = aboutSection && (text(aboutSection.title) || text(aboutSection.body)) ? block(aboutSection) : null;

  // ---------- Impact / Statistik ----------
  const impactSection = live.get("impact");
  let impact: PublicHomepage["impact"] = null;
  if (impactSection) {
    const c = content(impactSection);
    const stats = IMPACT_FIELDS.map(([vk, lk, dv, dl]) => ({ value: text(c[vk]) || dv, label: text(c[lk]) || dl }));
    impact = { ...block(impactSection), stats };
  }

  // ---------- Business Spotlight (section "videos") ----------
  const videoSection = live.get("videos");
  let spotlight: PublicHomepage["spotlight"] = null;
  if (videoSection) {
    const c = content(videoSection);
    const items = (Array.isArray(c.spotlights) ? c.spotlights : [])
      .map((raw) => raw as Record<string, unknown>)
      .filter((item) => item && item.isVisible !== false && text(item.brand) && youtubeId(text(item.videoUrl)))
      .map((item) => ({
        brand: text(item.brand), owner: text(item.owner), position: text(item.position),
        category: text(item.category), story: text(item.story), videoUrl: text(item.videoUrl),
      }));
    if (items.length) spotlight = { ...block(videoSection), items };
  }

  // ---------- Direktori Usaha & Testimoni (submission member yang sudah dipublikasikan) ----------
  const directorySection = live.get("business-directory");
  const testimonialSection = live.get("testimonials");
  let directory: PublicHomepage["directory"] = null;
  let testimonials: PublicHomepage["testimonials"] = null;
  if (directorySection || testimonialSection) {
    const flags = await memberImageFlags().catch(() => new Map());
    if (directorySection) {
      const rows = ((await listPublishedBusinesses().catch(() => ({ results: [] }))).results || []) as Record<string, unknown>[];
      const items = rows.filter((row) => text(row.businessName)).map((row) => ({
        id: Number(row.id), memberName: text(row.memberName), businessName: text(row.businessName),
        businessCategory: text(row.businessCategory), businessDescription: text(row.businessDescription),
        businessLocation: text(row.businessLocation),
        hasBusinessPhoto: Boolean(flags.get(Number(row.id))?.business), hasLogo: Boolean(flags.get(Number(row.id))?.logo),
      }));
      if (items.length) directory = { ...block(directorySection), items };
    }
    if (testimonialSection) {
      const rows = ((await listPublishedTestimonials().catch(() => ({ results: [] }))).results || []) as Record<string, unknown>[];
      const items = rows.filter((row) => text(row.testimonial) && text(row.memberName)).map((row) => ({
        id: Number(row.id), memberName: text(row.memberName), businessName: text(row.businessName),
        positionTitle: text(row.positionTitle), testimonial: text(row.testimonial),
        hasProfilePhoto: Boolean(flags.get(Number(row.id))?.profile),
      }));
      if (items.length) testimonials = { ...block(testimonialSection), items };
    }
  }

  // ---------- CTA bergabung ----------
  const ctaSection = live.get("join-cta");
  let ctaBlock: PublicHomepage["cta"];
  if (ctaSection && text(ctaSection.title)) {
    const b = block(ctaSection);
    ctaBlock = { ...b, primaryCta: b.primaryCta ?? { ...FALLBACK_CTA.primaryCta }, fromCms: true };
    if (!b.primaryCta) fallbacksUsed.push("section.join-cta.primaryCta");
  } else {
    fallbacksUsed.push("section.join-cta");
    ctaBlock = {
      section: "join-cta", eyebrow: "", title: FALLBACK_CTA.title, subtitle: "", body: FALLBACK_CTA.body,
      primaryCta: { ...FALLBACK_CTA.primaryCta }, secondaryCta: null, image: null, sortOrder: 120, fromCms: false,
    };
  }

  return {
    settings,
    navigation: chrome.navigation,
    hero, about, impact, spotlight, directory, testimonials, cta: ctaBlock,
    banners, gallery, fallbacksUsed,
  };
}
