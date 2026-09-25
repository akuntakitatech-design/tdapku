/*
 * Navigasi Website Publik (Website 02A) — logika MURNI (tanpa DB), dipakai bersama oleh:
 * - server: db/public-homepage.ts (PublicHeader/PublicFooter live) & route admin navigation (validasi)
 * - client: editor CMS Navigasi (validasi form + Preview lokal)
 * Sehingga preview editor, header desktop, dan menu mobile memakai aturan yang SAMA.
 * Schema existing public_navigation_items: location, label, href, parent_id, sort_order, is_active.
 */
import { FALLBACK_HEADER_NAV, safeHref } from "@/lib/public-site-content";

export type NavigationLocation = "header" | "footer";
export type NavigationRow = {
  id: number;
  location: NavigationLocation;
  label: string;
  href: string;
  parentId: number | null;
  sortOrder: number;
  isActive: number;
};
export type NavigationLink = { label: string; href: string };
export type NavigationInput = { location: NavigationLocation; label: string; href: string; sortOrder: number; isActive: boolean };

export const NAV_LABEL_MAX = 60;
export const NAV_HREF_MAX = 500;
export const NAV_SORT_MIN = 0;
export const NAV_SORT_MAX = 9999;
export const NAV_LOCATIONS: { value: NavigationLocation; label: string }[] = [
  { value: "header", label: "Header (menu utama)" },
  { value: "footer", label: "Footer" },
];

const INTERNAL_PATH_RE = /^\/(?!\/)[A-Za-z0-9\-._~/?#&=%+:@!$'()*,;]*$/;

/** URL/path menu: internal "/..." atau eksternal http(s) yang valid. Menolak javascript:, data:, "//host", spasi, dll. */
export function validateNavigationHref(value: unknown): { ok: true; href: string } | { ok: false; error: string } {
  const href = typeof value === "string" ? value.trim() : "";
  if (!href) return { ok: false, error: "URL / path wajib diisi." };
  if (href.length > NAV_HREF_MAX) return { ok: false, error: `URL / path maksimal ${NAV_HREF_MAX} karakter.` };
  if (/[\s\\<>"`]/.test(href) || /[\u0000-\u001f\u007f]/.test(href)) return { ok: false, error: "URL / path tidak boleh berisi spasi atau karakter khusus." };
  if (href.startsWith("/")) {
    return INTERNAL_PATH_RE.test(href) ? { ok: true, href } : { ok: false, error: "Path internal tidak valid. Contoh: /tentang" };
  }
  if (/^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href);
      if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname && !url.username && !url.password) return { ok: true, href };
    } catch {
      /* invalid */
    }
    return { ok: false, error: "URL eksternal tidak valid. Contoh: https://www.instagram.com/tdapekanbaru" };
  }
  return { ok: false, error: "Gunakan path internal (diawali /) atau URL eksternal (diawali https://)." };
}

export function validateNavigationInput(input: Record<string, unknown>):
  | { ok: true; value: NavigationInput }
  | { ok: false; errors: Partial<Record<keyof NavigationInput, string>> } {
  const errors: Partial<Record<keyof NavigationInput, string>> = {};
  const location = input.location === "footer" ? "footer" : input.location === "header" || input.location === undefined ? "header" : null;
  if (!location) errors.location = "Lokasi menu tidak valid.";
  const label = typeof input.label === "string" ? input.label.replace(/\s+/g, " ").trim() : "";
  if (!label) errors.label = "Label menu wajib diisi.";
  else if (label.length > NAV_LABEL_MAX) errors.label = `Label maksimal ${NAV_LABEL_MAX} karakter.`;
  const href = validateNavigationHref(input.href);
  if (!href.ok) errors.href = href.error;
  const rawSort = typeof input.sortOrder === "string" ? input.sortOrder.trim() : input.sortOrder;
  const sortOrder = rawSort === "" || rawSort === undefined || rawSort === null ? NaN : Number(rawSort);
  if (!Number.isInteger(sortOrder) || sortOrder < NAV_SORT_MIN || sortOrder > NAV_SORT_MAX) {
    errors.sortOrder = `Urutan harus bilangan bulat ${NAV_SORT_MIN}–${NAV_SORT_MAX}.`;
  }
  if (typeof input.isActive !== "boolean" && input.isActive !== 0 && input.isActive !== 1) errors.isActive = "Status aktif tidak valid.";
  if (Object.keys(errors).length || !location || !href.ok) return { ok: false, errors };
  return { ok: true, value: { location, label, href: href.href, sortOrder, isActive: input.isActive === true || input.isActive === 1 } };
}

/** Menu yang layak tampil publik untuk satu lokasi: aktif, tanpa parent, href aman, urut sort_order ASC lalu id ASC. */
export function publicNavigationLinks(rows: NavigationRow[], location: NavigationLocation): NavigationLink[] {
  return rows
    .filter((item) => item.location === location && !item.parentId && Number(item.isActive) === 1)
    .sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder) || Number(a.id) - Number(b.id))
    .map((item) => {
      const label = typeof item.label === "string" ? item.label.trim() : "";
      const safe = safeHref(item.href);
      return label && safe && safe !== "#" && validateNavigationHref(safe).ok ? { label, href: safe } : null;
    })
    .filter((item): item is NavigationLink => Boolean(item));
}

/**
 * Navigasi publik final. Header: CMS bila ada ≥1 menu header aktif yang valid, selain itu fallback existing
 * (website tidak pernah tanpa navigasi). Footer: menu footer CMS (PublicFooter memakai menu header bila kosong).
 */
export function resolvePublicNavigation(rows: NavigationRow[]) {
  const cmsHeader = publicNavigationLinks(rows, "header");
  const headerFromFallback = cmsHeader.length === 0;
  return {
    header: headerFromFallback ? FALLBACK_HEADER_NAV.map((item) => ({ ...item })) : cmsHeader,
    footer: publicNavigationLinks(rows, "footer"),
    headerFromFallback,
  };
}
