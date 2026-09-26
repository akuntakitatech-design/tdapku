import type { Metadata } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import "./globals.css";
import { getPublicSiteFavicon } from "@/db/public-site";
import { DEFAULT_FAVICON, faviconHref } from "@/lib/public-favicon";

// Design system Website Publik (major visual revision): Instrument Serif = display/headline, Manrope = body/UI.
// Instrument Serif hanya 400 normal (italic tidak dipakai headline → tidak dimuat); Manrope variable font (satu file per subset, bobot 200–800).
// Font ini hanya dipakai di dalam `.tda-public`; Backoffice tetap memakai font sistem (Arial) seperti production.
const displayFont = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-tda-display",
});

const sansFont = Manrope({
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  variable: "--font-tda-sans",
});

/**
 * Favicon dinamis: custom dari Website Publik → Pengaturan Website → Identitas Website (public_site_settings.favicon_key),
 * URL ber-versi (?v=<tag kunci>) → cache-busting saat diganti. Kosong / DB gagal → favicon default statis /favicon.svg.
 * Route /api/public-site/favicon sendiri juga redirect ke /favicon.svg bila objek tidak tersedia → tidak pernah rusak.
 */
// Halaman statis (mis. /checkin, /member) di-regenerasi berkala agar favicon custom ikut terbarui; halaman dinamis tidak terpengaruh.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  let icon = DEFAULT_FAVICON;
  try {
    const row = await getPublicSiteFavicon();
    icon = faviconHref(row?.faviconKey);
  } catch {
    icon = DEFAULT_FAVICON;
  }
  return {
    title: "Manajemen Program Kerja TDA Pekanbaru 9.0",
    description: "Dashboard program kerja dan kontrol kegiatan TDA Pekanbaru 9.0.",
    icons: { icon, shortcut: icon },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${displayFont.variable} ${sansFont.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
