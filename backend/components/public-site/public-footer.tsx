import { ArrowUpRight, AtSign, BriefcaseBusiness, Mail, MapPin, MessageCircle, Music2, PlaySquare } from "lucide-react";
import type { PublicCta, PublicHomepage, PublicNavigation } from "@/db/public-homepage";
import { MotifTile, PucukRebung, SikuKeluangDivider } from "@/components/public-site/motif";

const EXT = { target: "_blank", rel: "noopener noreferrer" } as const;
const linkClass = "tda-focus inline-flex min-h-11 items-center gap-3 rounded-lg transition-colors duration-200 hover:text-tda-soft";
const isExternal = (href: string) => /^https?:\/\//i.test(href);
const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "link";

/**
 * PublicFooter GLOBAL (Website 02) — SINGLE SOURCE OF TRUTH footer publik.
 * Sumber: public_site_settings (sudah divalidasi di db/public-homepage.ts). Field kosong/tidak valid tidak dirender
 * (tanpa link kosong, tanpa "#", tanpa javascript:). Link footer: public_navigation_items location=footer;
 * bila kosong → memakai menu header yang sama (fallback).
 */
export function PublicFooter({ settings, links, navigation }: {
  settings: PublicHomepage["settings"];
  links?: PublicCta[];
  navigation?: PublicNavigation;
}) {
  const footerLinks = navigation ? (navigation.footer.length ? navigation.footer : navigation.header) : links ?? [];
  const contacts = [
    settings.email ? { key: "email", href: `mailto:${settings.email}`, label: settings.email, icon: Mail, external: false } : null,
    settings.whatsappUrl ? { key: "whatsapp", href: settings.whatsappUrl, label: `WhatsApp ${settings.whatsappLabel ?? ""}`.trim(), icon: MessageCircle, external: true } : null,
  ].filter(Boolean) as { key: string; href: string; label: string; icon: typeof Mail; external: boolean }[];
  const social = [
    settings.instagramUrl ? { key: "instagram", href: settings.instagramUrl, label: settings.instagramLabel || "Instagram", icon: AtSign } : null,
    settings.youtubeUrl ? { key: "youtube", href: settings.youtubeUrl, label: "YouTube", icon: PlaySquare } : null,
    settings.linkedinUrl ? { key: "linkedin", href: settings.linkedinUrl, label: "LinkedIn", icon: BriefcaseBusiness } : null,
    settings.tiktokUrl ? { key: "tiktok", href: settings.tiktokUrl, label: "TikTok", icon: Music2 } : null,
  ].filter(Boolean) as { key: string; href: string; label: string; icon: typeof Mail }[];

  return (
    <footer data-testid="public-footer" className="relative overflow-hidden bg-tda-navy text-[color:var(--tda-on-dark)]">
      <MotifTile strong className="absolute right-0 top-0 h-72 w-72 md:h-96 md:w-[28rem]" />
      <PucukRebung className="absolute -bottom-16 -left-10 hidden h-56 w-56 text-tda-soft md:block" />
      <div className="tda-container relative py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1.2fr]">
          <div>
            <img src="/tda-pekanbaru.png" alt="Logo TDA Pekanbaru" className="h-12 w-28 rounded-lg bg-white object-contain p-1.5" />
            <p data-testid="footer-site-name" className="tda-display mt-5 text-3xl">{settings.siteName}</p>
            {settings.siteTagline ? <p data-testid="footer-site-tagline" className="mt-1 font-semibold text-tda-soft">{settings.siteTagline}</p> : null}
            {settings.siteDescription ? (
              <p data-testid="footer-site-description" className="mt-3 max-w-sm whitespace-pre-line text-sm leading-6 text-[color:var(--tda-on-dark-muted)]">{settings.siteDescription}</p>
            ) : null}
          </div>

          {contacts.length || social.length ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-tda-soft">Hubungi Kami</p>
              <ul className="mt-4 space-y-1 text-sm">
                {contacts.map((item) => (
                  <li key={item.key}>
                    <a href={item.href} data-testid={`footer-${item.key}-link`} className={`${linkClass} break-all`} {...(item.external ? EXT : {})}>
                      <item.icon className="size-4 shrink-0 text-tda-soft" />{item.label}
                    </a>
                  </li>
                ))}
                {social.map((item) => (
                  <li key={item.key}>
                    <a href={item.href} data-testid={`footer-${item.key}-link`} className={linkClass} {...EXT}>
                      <item.icon className="size-4 shrink-0 text-tda-soft" />{item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {settings.addressLines.length ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-tda-soft">Sekretariat</p>
              <div className="mt-4 flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-tda-soft" />
                <div>
                  <p className="font-bold">{settings.addressTitle}</p>
                  <address data-testid="footer-address" className="mt-1 text-sm not-italic leading-6 text-[color:var(--tda-on-dark-muted)]">
                    {settings.addressLines.map((line, index) => <span key={`${index}-${line}`} className="block">{line}</span>)}
                  </address>
                  {settings.mapsUrl ? (
                    <a href={settings.mapsUrl} data-testid="footer-maps-link" className="tda-focus mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-bold text-tda-soft hover:text-white" {...EXT}>
                      Buka di Google Maps <ArrowUpRight className="size-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <SikuKeluangDivider strong className="mt-12 [filter:brightness(2.4)]" />
        <div className="mt-6 flex flex-col gap-3 text-sm text-[color:var(--tda-on-dark-muted)] md:flex-row md:items-center md:justify-between">
          <p data-testid="footer-text">{settings.footerText}</p>
          {footerLinks.length ? (
            <nav aria-label="Navigasi footer" data-testid="footer-nav" className="flex flex-wrap gap-x-5 gap-y-1">
              {footerLinks.map((link) => (
                <a key={link.href + link.label} href={link.href} data-testid={`footer-nav-${slug(link.label)}-link`}
                  className="tda-focus inline-flex min-h-11 items-center rounded font-semibold transition-colors duration-200 hover:text-white"
                  {...(isExternal(link.href) ? EXT : {})}>{link.label}</a>
              ))}
            </nav>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
