/*
 * Konten & helper bersama Website Publik (dipakai server + editor CMS).
 * CATATAN FALLBACK: nilai FALLBACK_* di bawah BUKAN konten baru — dipindahkan apa adanya dari
 * homepage lama (hardcoded) dan HANYA dipakai bila field CMS terkait kosong / section belum published.
 * Sumber utama tetap CMS (public_site_settings / public_site_sections). Dibereskan di fase berikutnya.
 */

/** Statistik Impact: [kunci nilai, kunci label, default nilai, default label] — sama persis dgn editor CMS. */
export const IMPACT_FIELDS = [
  ["impact1Value", "impact1Label", "500+", "Member & Alumni"],
  ["impact2Value", "impact2Label", "50+", "Program Edukasi"],
  ["impact3Value", "impact3Label", "100+", "Kolaborasi Bisnis"],
  ["impact4Value", "impact4Label", "Berdampak", "untuk Masyarakat"],
] as const;

export const FALLBACK_SITE = {
  siteName: "TDA Pekanbaru 9.0",
  footerText: "#RiangGembira · Let's 9.0 Together",
  contactEmail: "pekanbaru@tangandiatas.com",
  contactWhatsapp: "6285121804468",
  instagramUrl: "https://www.instagram.com/tdapekanbaru",
  addressTitle: "Sekretariat TDA Pekanbaru",
  address: "Gedung Menara Poltekkes Kemenkes Riau, Lantai 8\nJl. Melur No. 26, Padang Bulan, Senapelan\nKota Pekanbaru, Riau 28156",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Gedung+Menara+Poltekkes+Kemenkes+Riau+Jl.+Melur+No.+26+Pekanbaru",
} as const;

export const FALLBACK_HEADER_NAV = [
  { label: "Profil", href: "/tentang" },
  { label: "Program", href: "/program" },
  { label: "Kalender", href: "/kalender" },
] as const;

/**
 * CTA header FALLBACK (safety) bila CTA belum diatur dari backend (Website Publik → Navigasi → CTA Header).
 * /member = pendaftaran Member Baru & Kelas Reguler. (/form/member = Profil Usaha & Testimoni, bukan pendaftaran.)
 */
export const FALLBACK_HEADER_CTA = { label: "Gabung TDA", href: "/member" } as const;

export const FALLBACK_HERO = {
  eyebrow: "Let's 9.0 Together",
  title: "Ruang bertumbuh dan berkolaborasi bagi pengusaha Pekanbaru.",
  subtitle: "",
  body: "Temukan program, kelas, dan kegiatan yang membantu Anda memperluas wawasan, jaringan, serta peluang bisnis bersama TDA Pekanbaru.",
  primaryCta: { label: "Lihat Program & Kegiatan", href: "/program" },
  secondaryCta: { label: "Daftar Member & Kelas Reguler", href: "/member" },
} as const;

export const FALLBACK_CTA = {
  title: "Siap tumbuh bersama TDA?",
  body: "Mulai perjalanan Anda melalui program dan Kelas Reguler TDA Pekanbaru.",
  primaryCta: { label: "Daftar Sekarang", href: "/member" },
} as const;

/** Hanya URL aman: http(s), mailto, tel, path relatif, atau anchor. Selain itu → null. */
export function safeHref(value: unknown): string | null {
  const href = typeof value === "string" ? value.trim() : "";
  if (!href) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(href)) return href;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (/^#[A-Za-z0-9_-]+$/.test(href)) return href;
  return null;
}

export function youtubeId(url: string) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "").split("?")[0];
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/shorts/")[1]?.split("/")[0] || "";
    if (u.pathname.startsWith("/embed/")) return u.pathname.split("/embed/")[1]?.split("/")[0] || "";
    return u.searchParams.get("v") || "";
  } catch {
    return "";
  }
}

/** "0851-2180-4468" / "+62 851..." → "6285121804468" (untuk wa.me). */
export function whatsappDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

export function instagramHandle(url: string) {
  const match = url.match(/instagram\.com\/([A-Za-z0-9_.]+)/i);
  return match ? `@${match[1]}` : url.replace(/^https?:\/\//, "");
}
