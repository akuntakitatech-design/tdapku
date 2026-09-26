import { ArrowUpRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { PublicCta, PublicHomepage, PublicNavigation } from "@/db/public-homepage";
import { resolveFooter, type ContactKey, type ResolvedFooter, type ResolvedLink, type SocialPlatform } from "@/lib/public-footer";
import { PucukRebungAccent, Selembayung } from "@/components/public-site/motif";
import { BrandLogo } from "@/components/public-site/brand-logo";

/*
 * PublicFooter GLOBAL — SINGLE SOURCE OF TRUTH footer publik (Footer Builder).
 * Data: ResolvedFooter dari db/public-homepage.ts (konfigurasi PUBLISHED; fallback aman bila belum ada).
 * Tampilan dikunci developer: layout 3/4/5 kolom, tema Deep Navy / Indigo Gradient / Light, motif none /
 * Pucuk Rebung / Selembayung (subtle 6% / medium 10%). Tidak ada CSS bebas dari admin.
 * `mode`/`idPrefix` hanya untuk Preview editor (memaksa tampilan desktop/mobile di kotak preview).
 */

type Mode = "responsive" | "desktop" | "mobile";

const GRID: Record<Mode, Record<3 | 4 | 5, string>> = {
  responsive: { 3: "grid-cols-2 lg:grid-cols-3", 4: "grid-cols-2 lg:grid-cols-4", 5: "grid-cols-2 lg:grid-cols-5" },
  desktop: { 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" },
  mobile: { 3: "grid-cols-2", 4: "grid-cols-2", 5: "grid-cols-2" },
};
/** Blok identitas & kontak selebar penuh di mobile; kolom link tampil 2 per baris agar footer tidak terlalu panjang. */
const WIDE: Record<Mode, string> = { responsive: "col-span-2 lg:col-span-1", desktop: "", mobile: "col-span-2" };

const THEME = {
  "deep-navy": { root: "bg-tda-navy text-white", muted: "text-[color:var(--tda-on-dark-muted)]", accent: "text-tda-soft", line: "border-white/12", card: "border-white/12 bg-white/[0.04]", link: "hover:text-white", btn: "tda-btn-light", motif: "text-tda-soft", chip: "border-white/15 hover:bg-white/10" },
  "indigo-gradient": { root: "bg-tda-navy text-white", muted: "text-[color:var(--tda-on-dark-muted)]", accent: "text-tda-soft", line: "border-white/15", card: "border-white/15 bg-white/[0.06]", link: "hover:text-white", btn: "tda-btn-light", motif: "text-tda-soft", chip: "border-white/20 hover:bg-white/10" },
  light: { root: "bg-tda-bg-soft text-tda-ink border-t border-[color:var(--tda-border)]", muted: "text-tda-muted", accent: "text-tda-indigo", line: "border-[color:var(--tda-border)]", card: "border-[color:var(--tda-border)] bg-white", link: "hover:text-tda-navy", btn: "tda-btn-primary", motif: "text-tda-indigo", chip: "border-[color:var(--tda-border-strong)] hover:bg-tda-bg-tint" },
} as const;

const CONTACT_ICON: Record<ContactKey, typeof Mail> = { whatsapp: MessageCircle, email: Mail, phone: Phone, address: MapPin, maps: ArrowUpRight };

/** Glyph sosial monoline ringan (inline SVG, tanpa library ikon tambahan; lucide tidak menyediakan logo merek). */
function SocialGlyph({ platform }: { platform: SocialPlatform }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true" focusable="false" {...common}>
      {platform === "instagram" ? <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" /></> : null}
      {platform === "youtube" ? <><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" /></> : null}
      {platform === "linkedin" ? <><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="M8 10.5v6M8 7.5v.01M11.5 16.5v-6M11.5 13.2c0-1.6 1-2.7 2.5-2.7s2.5 1 2.5 2.7v3.3" /></> : null}
      {platform === "tiktok" ? <path d="M14 3.5v11a3.5 3.5 0 1 1-3.5-3.5M14 3.5c.4 2.6 2.2 4.3 4.8 4.5" /> : null}
      {platform === "facebook" ? <path d="M14.5 8.5H17V5h-2.5A3.5 3.5 0 0 0 11 8.5V11H8.5v3.5H11V21h3.5v-6.5H17l.5-3.5h-3V9a.5.5 0 0 1 .5-.5z" /> : null}
    </svg>
  );
}

const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "link";
const linkProps = (link: { newTab: boolean }) => (link.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {});

type LegacyProps = { settings: PublicHomepage["settings"]; links?: PublicCta[]; navigation?: PublicNavigation };

export function PublicFooter(props: { footer: ResolvedFooter; mode?: Mode; idPrefix?: string } | (LegacyProps & { footer?: undefined; mode?: Mode; idPrefix?: string })) {
  // Kompatibilitas pemanggil lama ({ settings, links/navigation }) → fallback aman yang sama.
  const footer = props.footer ?? resolveFooter(null, props.settings, props.navigation ? (props.navigation.footer.length ? props.navigation.footer : props.navigation.header) : props.links ?? []);
  const mode: Mode = props.mode ?? "responsive";
  const p = props.idPrefix ?? "";
  const t = THEME[footer.appearance.theme];
  const opacity = footer.appearance.motifIntensity === "medium" ? 0.1 : 0.06;
  const mobile = mode === "mobile";
  const container = mode === "responsive" ? "tda-container" : "w-full px-6";
  const link = `tda-focus inline-flex min-h-11 items-center gap-2 rounded-lg transition-colors duration-200 ${t.link}`;

  const columnLink = (item: ResolvedLink, key: string) => (
    <li key={key}>
      <a href={item.href} data-testid={`${p}footer-link-${key}`} className={`${link} ${t.muted}`} {...linkProps(item)}>
        {item.label}{item.external ? <ArrowUpRight className="size-3.5 opacity-70" /> : null}
      </a>
    </li>
  );

  return (
    <footer data-testid={`${p}public-footer`} data-theme={footer.appearance.theme} data-layout={footer.appearance.layout}
      data-source={footer.fromBuilder ? "builder" : "fallback"} className={`relative overflow-hidden ${t.root}`}>
      {footer.appearance.theme === "indigo-gradient" ? <div aria-hidden="true" className="absolute inset-0 opacity-60" style={{ backgroundImage: "var(--tda-gradient)" }} /> : null}
      {footer.appearance.motif === "selembayung" ? (
        <Selembayung testId={`${p}footer-motif-selembayung`} opacity={opacity}
          className={`absolute -right-6 top-6 ${mobile ? "w-[220px]" : "w-[260px] md:w-[380px]"} ${t.motif}`} />
      ) : null}
      {footer.appearance.motif === "pucuk-rebung" ? (
        <PucukRebungAccent testId={`${p}footer-motif-pucuk-rebung`} opacity={opacity}
          className={`absolute -bottom-6 right-6 ${mobile ? "w-[120px]" : "w-[150px] md:w-[210px]"} ${t.motif}`} />
      ) : null}

      <div className={`${container} relative py-14 ${mobile ? "" : "md:py-16"}`}>
        {footer.cta ? (
          <div data-testid={`${p}footer-cta`} className={`mb-12 flex flex-col gap-5 rounded-2xl border p-6 ${mobile ? "" : "md:flex-row md:items-center md:justify-between md:p-8"} ${t.card}`}>
            <div className="max-w-2xl">
              <p data-testid={`${p}footer-cta-title`} className={`tda-display leading-[1.1] ${mobile ? "text-[30px]" : "text-[30px] md:text-[40px]"}`}>{footer.cta.title}</p>
              {footer.cta.description ? <p className={`mt-2 text-[15px] leading-7 ${t.muted}`}>{footer.cta.description}</p> : null}
            </div>
            <a href={footer.cta.href} data-testid={`${p}footer-cta-button`} className={`tda-btn ${t.btn} min-h-12 shrink-0 px-6`}
              {...(footer.cta.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{footer.cta.buttonLabel}</a>
          </div>
        ) : null}

        <div className={`grid gap-x-6 gap-y-10 ${GRID[mode][footer.appearance.layout]}`}>
          {footer.brand ? (
            <div data-testid={`${p}footer-brand`} className={`min-w-0 ${WIDE[mode]}`}>
              {footer.brand.logoSources.length ? (
                <BrandLogo sources={footer.brand.logoSources} alt={`Logo ${footer.brand.name}`} width={128} height={56}
                  className={`h-14 w-32 object-contain ${footer.brand.logoPlate ? "rounded-lg bg-white p-1.5" : "object-left"}`} testId={`${p}footer-logo`} />
              ) : null}
              <p data-testid={`${p}footer-site-name`} className="tda-display mt-5 text-[32px] leading-none">{footer.brand.name}</p>
              {footer.brand.tagline ? <p data-testid={`${p}footer-site-tagline`} className={`mt-2 text-sm font-semibold ${t.accent}`}>{footer.brand.tagline}</p> : null}
              {footer.brand.description ? <p data-testid={`${p}footer-site-description`} className={`mt-3 max-w-xs whitespace-pre-line text-sm leading-6 ${t.muted}`}>{footer.brand.description}</p> : null}
              {footer.brand.hashtag ? <p data-testid={`${p}footer-hashtag`} className={`mt-3 text-sm font-bold tracking-wide ${t.accent}`}>{footer.brand.hashtag}</p> : null}
              {footer.social.length ? (
                <ul className="mt-5 flex flex-wrap gap-2" data-testid={`${p}footer-social`}>
                  {footer.social.map((item) => (
                    <li key={item.platform}>
                      <a href={item.href} target="_blank" rel="noopener noreferrer" aria-label={item.label} title={item.label}
                        data-testid={`${p}footer-${item.platform}-link`}
                        className={`tda-focus grid size-11 place-items-center rounded-full border transition-colors duration-200 ${t.chip}`}>
                        <SocialGlyph platform={item.platform} />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {footer.columns.map((column) => (
            <nav key={column.id} aria-label={column.title} data-testid={`${p}footer-column-${column.id}`} className="min-w-0">
              <p className={`text-xs font-bold uppercase tracking-[0.18em] ${t.accent}`}>{column.title}</p>
              <ul className="mt-3 text-sm">{column.links.map((item) => columnLink(item, `${column.id}-${slug(item.label)}`))}</ul>
            </nav>
          ))}

          {footer.contact ? (
            <div data-testid={`${p}footer-contact`} className={`min-w-0 ${WIDE[mode]}`}>
              <p className={`text-xs font-bold uppercase tracking-[0.18em] ${t.accent}`}>{footer.contact.title}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {footer.contact.items.map((item) => {
                  const Icon = CONTACT_ICON[item.key];
                  if (item.key === "address") {
                    return (
                      <li key={item.key} className="flex gap-2 py-2">
                        <Icon className={`mt-0.5 size-4 shrink-0 ${t.accent}`} />
                        <address data-testid={`${p}footer-address`} className={`not-italic leading-6 ${t.muted}`}>
                          <span className="block font-semibold">{item.label}</span>
                          {item.lines?.map((line, index) => <span key={`${index}-${line}`} className="block">{line}</span>)}
                        </address>
                      </li>
                    );
                  }
                  const external = item.key === "whatsapp" || item.key === "maps";
                  return (
                    <li key={item.key}>
                      <a href={item.href ?? undefined} data-testid={`${p}footer-${item.key}-link`} className={`${link} ${t.muted} break-all`}
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                        <Icon className={`size-4 shrink-0 ${t.accent}`} />{item.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>

        {footer.bottom ? (
          <div className={`mt-12 flex flex-col gap-3 border-t pt-6 text-sm ${mobile ? "" : "md:flex-row md:items-center md:justify-between"} ${t.line} ${t.muted}`}>
            <p data-testid={`${p}footer-text`}>{footer.bottom.copyright}</p>
            {footer.bottom.links.length ? (
              <nav aria-label="Tautan legal" data-testid={`${p}footer-bottom-nav`} className="flex flex-wrap gap-x-5 gap-y-1">
                {footer.bottom.links.map((item) => (
                  <a key={item.href + item.label} href={item.href} data-testid={`${p}footer-bottom-${slug(item.label)}-link`}
                    className={`tda-focus inline-flex min-h-11 items-center rounded font-semibold transition-colors duration-200 ${t.link}`} {...linkProps(item)}>{item.label}</a>
                ))}
              </nav>
            ) : null}
          </div>
        ) : null}
      </div>
    </footer>
  );
}
