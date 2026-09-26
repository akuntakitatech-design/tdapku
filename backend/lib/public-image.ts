/**
 * Helper PRESENTASI gambar publik (aman dipakai di server & client component).
 *
 * Gambar CMS/flyer/galeri disimpan sebagai file asli (bisa 2–8 MB) dan diproxy lewat route /api/... .
 * Untuk tampilan, gambar tersebut dilewatkan ke optimizer Next (/_next/image) dengan lebar responsif,
 * sehingga browser hanya mengunduh versi WebP seukuran tampilan. File asli di R2 TIDAK diubah.
 */

/** Lebar yang diizinkan optimizer Next (deviceSizes + imageSizes default). */
const ALLOWED_WIDTHS = new Set([32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]);
const OPTIMIZABLE_PREFIXES = ["/api/public-site/image", "/api/public-programs/", "/api/public-media/"];

export function isOptimizableImage(src: string | null | undefined): src is string {
  return typeof src === "string" && OPTIMIZABLE_PREFIXES.some((prefix) => src.startsWith(prefix));
}

export function optimizedImageSrc(src: string, width: number, quality = 75) {
  const w = ALLOWED_WIDTHS.has(width) ? width : 1080;
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${quality}`;
}

/**
 * `src` + `srcSet` responsif. Sumber non-proxy (mis. /hero/*.webp statis) dikembalikan apa adanya.
 * `fallbackWidth` dipakai sebagai `src` (browser tanpa dukungan srcset).
 */
export function responsiveImage(src: string, widths: number[] = [640, 828, 1080, 1920], fallbackWidth?: number) {
  if (!isOptimizableImage(src)) return { src, srcSet: undefined as string | undefined };
  const list = widths.filter((width) => ALLOWED_WIDTHS.has(width));
  const fallback = fallbackWidth && ALLOWED_WIDTHS.has(fallbackWidth) ? fallbackWidth : list[Math.min(list.length - 1, 2)] ?? 1080;
  return {
    src: optimizedImageSrc(src, fallback),
    srcSet: list.map((width) => `${optimizedImageSrc(src, width)} ${width}w`).join(", "),
  };
}

/** Tag versi pendek & deterministik (FNV-1a 32-bit) — untuk cache busting URL tanpa membocorkan kunci R2. */
export function versionTag(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/** URL flyer Program publik + versi dari kunci flyer (flyer diganti → URL baru → cache lama tidak terpakai). */
export function programFlyerUrl(programCode: string, flyerKey?: string | null) {
  const base = `/api/public-programs/${programCode}/flyer`;
  return flyerKey ? `${base}?v=${versionTag(flyerKey)}` : base;
}
