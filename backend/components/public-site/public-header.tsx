import Link from "next/link";
import { Menu, X } from "lucide-react";
import type { PublicCta, PublicNavigation } from "@/db/public-homepage";
import { BrandLogo } from "@/components/public-site/brand-logo";
import { logoSources, type LogoSize, type ResolvedLogo } from "@/lib/public-logo";

/** Preset ukuran logo header (tanpa CSS bebas). Rasio ±2,2 : 1 mengikuti logo TDA. */
const LOGO_SIZE: Record<LogoSize, { className: string; width: number; height: number }> = {
  sm: { className: "h-9 w-20", width: 80, height: 36 },
  md: { className: "h-11 w-24", width: 96, height: 44 },
  lg: { className: "h-14 w-32", width: 128, height: 56 },
};

function slug(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "link";
}

const isExternal = (href: string) => /^https?:\/\//i.test(href);

/** Aktif bila path sama persis, atau path berada di bawah href (kecuali beranda "/"). */
export function isActiveNav(href: string, current: string) {
  if (isExternal(href) || href.startsWith("#")) return false;
  const path = href.split(/[?#]/)[0] || "/";
  if (path === "/") return current === "/";
  return current === path || current.startsWith(`${path}/`);
}

function NavLink({ link, current, mobile, idPrefix }: { link: PublicCta; current: string; mobile?: boolean; idPrefix: string }) {
  const active = isActiveNav(link.href, current);
  const external = isExternal(link.href);
  const testId = `${idPrefix}${mobile ? "mobile" : "header"}-nav-${slug(link.label)}-link`;
  const className = mobile
    ? `tda-focus flex min-h-12 items-center rounded-xl px-4 text-[15px] font-semibold transition-colors duration-200 ${active ? "bg-tda-bg-tint text-tda-indigo" : "text-tda-navy hover:bg-tda-bg-tint"}`
    : `tda-focus relative rounded-lg px-3.5 py-2.5 text-[15px] font-semibold transition-colors duration-200 hover:text-tda-navy ${active ? "text-tda-indigo after:absolute after:inset-x-3.5 after:-bottom-[3px] after:h-0.5 after:rounded-full after:bg-tda-indigo" : "text-tda-muted hover:bg-tda-bg-tint"}`;
  return (
    <a href={link.href} data-testid={testId} aria-current={active ? "page" : undefined} className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {link.label}
    </a>
  );
}

export type PublicHeaderMode = "responsive" | "desktop" | "mobile";

/**
 * PublicHeader GLOBAL (Website 02) — SINGLE SOURCE OF TRUTH header publik.
 * Desktop & mobile memakai SATU sumber `navigation.header` (public_navigation_items aktif; fallback bila kosong).
 * Menu mobile memakai <details> tanpa JS.
 * `mode`/`idPrefix` hanya untuk Preview editor CMS (Website 02A): memaksa tampilan desktop/mobile di dalam
 * kotak preview, tanpa sticky, dengan data-testid berprefix agar tidak bentrok. Default = perilaku publik.
 */
export function PublicHeader({ siteName, navigation, current, mode = "responsive", idPrefix = "", logo }: {
  siteName: string; navigation: PublicNavigation; current: string; mode?: PublicHeaderMode; idPrefix?: string;
  /** Logo header hasil resolusi (khusus → Logo Utama → statis). Kosong = logo statis (pemanggil lama). */
  logo?: ResolvedLogo;
}) {
  const brand = logo ?? { sources: logoSources(null, null), alt: `Logo ${siteName || "TDA Pekanbaru"}`, size: "md" as LogoSize };
  const logoSize = LOGO_SIZE[brand.size] ?? LOGO_SIZE.md;
  // CTA dari backend (Website Publik → Navigasi → CTA Header); null = dinonaktifkan → tidak dirender di desktop & mobile.
  const cta = navigation.headerCta;
  const preview = mode !== "responsive";
  const desktopNavClass = mode === "desktop" ? "flex" : mode === "mobile" ? "hidden" : "hidden md:flex";
  const mobileClass = mode === "mobile" ? "block" : mode === "desktop" ? "hidden" : "md:hidden";
  return (
    <header data-testid={`${idPrefix}public-header`}
      className={`${preview ? "relative" : "sticky top-0 z-[var(--tda-z-header)]"} border-b border-[color:var(--tda-border)] bg-white/[0.97] backdrop-blur`}>
      <div className={`${preview ? "w-full px-5" : "tda-container"} flex h-[72px] items-center justify-between gap-4`}>
        <Link href="/" data-testid={`${idPrefix}header-home-link`} aria-current={current === "/" ? "page" : undefined} className="tda-focus flex min-w-0 items-center gap-3">
          {/* Above-the-fold → tidak lazy (priority). */}
          <BrandLogo sources={brand.sources} alt={brand.alt} width={logoSize.width} height={logoSize.height} priority={!preview}
            className={`${logoSize.className} shrink-0 object-contain`} testId={`${idPrefix}header-logo`} />
          <span className={`${mode === "mobile" ? "hidden" : "hidden sm:block"} min-w-0 border-l border-[color:var(--tda-border)] pl-3`}>
            <span className={`${mode === "desktop" ? "block" : "hidden lg:block"} text-[11px] font-bold uppercase tracking-[0.18em] text-tda-indigo`}>Komunitas Pengusaha</span>
            <span data-testid={`${idPrefix}header-site-name`} className="block truncate text-[15px] font-bold text-tda-navy">{siteName}</span>
          </span>
        </Link>

        <nav aria-label="Navigasi utama" data-testid={`${idPrefix}header-desktop-nav`} className={`${desktopNavClass} items-center gap-1`}>
          {navigation.header.map((link) => <NavLink key={link.href + link.label} link={link} current={current} idPrefix={idPrefix} />)}
          {cta ? <a href={cta.href} data-testid={`${idPrefix}header-join-button`} className="tda-btn tda-btn-primary ml-2 min-h-11 whitespace-nowrap px-5">{cta.label}</a> : null}
        </nav>

        <details className={`group relative ${mobileClass}`} data-testid={`${idPrefix}header-mobile-menu`} open={mode === "mobile" ? true : undefined}>
          <summary data-testid={`${idPrefix}header-mobile-menu-button`} aria-label="Buka menu navigasi"
            className="tda-focus grid size-11 cursor-pointer list-none place-items-center rounded-xl border border-[color:var(--tda-border-strong)] text-tda-navy [&::-webkit-details-marker]:hidden">
            <Menu className="size-5 group-open:hidden" />
            <X className="hidden size-5 group-open:block" />
          </summary>
          <nav aria-label="Navigasi mobile" className="absolute right-0 top-[calc(100%+10px)] z-[var(--tda-z-menu)] w-[min(86vw,320px)] rounded-2xl border border-[color:var(--tda-border)] bg-white p-2 shadow-[var(--tda-shadow-md)]">
            {navigation.header.map((link) => <NavLink key={link.href + link.label} link={link} current={current} mobile idPrefix={idPrefix} />)}
            {cta ? <a href={cta.href} data-testid={`${idPrefix}mobile-join-button`} className="tda-btn tda-btn-primary mt-2 w-full">{cta.label}</a> : null}
          </nav>
        </details>
      </div>
    </header>
  );
}
