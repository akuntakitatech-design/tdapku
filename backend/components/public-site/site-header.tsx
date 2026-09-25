/*
 * COMPATIBILITY LAYER (Website 02) — JANGAN tambah logic rendering di sini.
 * Implementasi utama header publik: `PublicHeader` (components/public-site/public-header.tsx).
 * Adapter tipis ini hanya menerjemahkan props lama `{ siteName, links }` → props PublicHeader.
 */
import { PublicHeader } from "@/components/public-site/public-header";
import type { PublicCta, PublicNavigation } from "@/db/public-homepage";
import { FALLBACK_HEADER_CTA } from "@/lib/public-site-content";

export { PublicHeader };

type LegacyProps = { siteName: string; links: PublicCta[]; current?: string };
type NewProps = { siteName: string; navigation: PublicNavigation; current: string };

export function SiteHeader(props: LegacyProps | NewProps) {
  if ("navigation" in props) return <PublicHeader {...props} />;
  return (
    <PublicHeader
      siteName={props.siteName}
      current={props.current ?? "/"}
      navigation={{ header: props.links, footer: [], headerCta: { ...FALLBACK_HEADER_CTA } }}
    />
  );
}
