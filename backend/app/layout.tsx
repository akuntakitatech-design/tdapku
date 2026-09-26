import type { Metadata } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Manajemen Program Kerja TDA Pekanbaru 9.0",
  description: "Dashboard program kerja dan kontrol kegiatan TDA Pekanbaru 9.0.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

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
