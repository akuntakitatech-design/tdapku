/**
 * Origin publik aplikasi (untuk link share, QR pendaftaran, URL flyer di metadata OG).
 * - Server (SSR/route handler): dari env APP_URL (Coolify), fallback ke domain produksi.
 * - Browser: origin halaman yang sedang dibuka, sehingga selalu cocok dengan domain aktif.
 * Jangan hardcode domain di komponen; pakai fungsi ini.
 */
export const DEFAULT_PUBLIC_ORIGIN = "https://tdapekanbaru.id";

export function publicOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  const configured = process.env.APP_URL?.trim();
  return (configured || DEFAULT_PUBLIC_ORIGIN).replace(/\/+$/, "");
}

/** Host tanpa skema, mis. "tdapekanbaru.id" — untuk teks tampilan. */
export function publicHost(): string {
  return publicOrigin().replace(/^https?:\/\//, "");
}
