import type { Metadata } from "next";
import { DM_Serif_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Design system TDA Pekanbaru (Website 00): DM Serif Display = display/heading, Plus Jakarta Sans = body/UI.
const displayFont = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-tda-display",
});

const sansFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
