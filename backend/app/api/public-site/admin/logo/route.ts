import { accessErrorResponse, requireKetua } from "@/db/access-control";
import {
  clearPublicSiteSectionImage,
  createChromeSection,
  getChromeSectionForAdmin,
  getPublicSiteLogo,
  setPublicSiteLogoKey,
  setPublicSiteSectionContent,
  setPublicSiteSectionImage,
  type ChromeSectionKey,
} from "@/db/public-site";
import { defaultFooterConfig } from "@/lib/public-footer";
import { defaultHeaderConfig, LOGO_UPLOAD_MAX_BYTES, LOGO_UPLOAD_TYPES } from "@/lib/public-logo";

/*
 * ADMIN LOGO WEBSITE (Ketua / CMS existing).
 * target = "global" → Logo Utama (public_site_settings.logo_key) — berlaku langsung.
 * target = "header" | "footer" → logo KHUSUS di working copy (image_key section chrome) — baru live setelah Publish.
 * R2 SAFETY (NON-DESTRUCTIVE): unggah/ganti/lepas logo HANYA mengubah referensi. Objek R2 lama TIDAK PERNAH dihapus
 * otomatis (termasuk bila sudah tidak direferensikan) — tidak ada cleanup orphan di sini. Keamanan media > hemat storage.
 */
export const dynamic = "force-dynamic";

const TARGETS = ["global", "header", "footer"] as const;
type Target = (typeof TARGETS)[number];

function parseTarget(value: unknown): Target | null {
  return TARGETS.includes(value as Target) ? (value as Target) : null;
}

/** Perkecil logo (maks. 640×320, WebP, alpha dipertahankan) agar website ringan. Gagal → pakai file asli. */
async function optimizeLogo(file: File): Promise<File> {
  try {
    const sharp = (await import("sharp")).default;
    const input = Buffer.from(await file.arrayBuffer());
    const meta = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
    const output = await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 640, height: 320, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88, alphaQuality: 100 })
      .toBuffer();
    // File asli sudah kecil & dimensinya dalam batas → pertahankan asli bila hasil konversi justru lebih besar.
    if ((meta.width ?? 0) <= 640 && (meta.height ?? 0) <= 320 && output.length >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 80) || "logo";
    return new File([new Uint8Array(output)], `${base}.webp`, { type: "image/webp" });
  } catch (reason) {
    console.warn("[logo] optimasi gagal, memakai file asli:", reason instanceof Error ? reason.message : reason);
    return file;
  }
}

async function ensureChromeSection(key: ChromeSectionKey, userId: number) {
  const existing = await getChromeSectionForAdmin(key);
  if (existing) return existing.id;
  const content = key === "footer" ? defaultFooterConfig() : defaultHeaderConfig();
  return createChromeSection(key, JSON.stringify(content), userId);
}

/** Set mode logo di WORKING COPY (draft) tanpa menyentuh isian lain. */
async function setDraftLogoMode(key: ChromeSectionKey, id: number, mode: "inherit" | "custom", userId: number) {
  const section = await getChromeSectionForAdmin(key);
  if (!section) return;
  const working = { ...section.working } as Record<string, unknown>;
  if (key === "footer") {
    const identity = { ...((working.identity as Record<string, unknown>) ?? {}) };
    identity.logoMode = mode;
    working.identity = identity;
  } else {
    const logo = { ...((working.logo as Record<string, unknown>) ?? {}) };
    logo.mode = mode;
    working.logo = logo;
    working.version = 1;
  }
  await setPublicSiteSectionContent(id, JSON.stringify(working), userId);
}

export async function GET() {
  try {
    await requireKetua();
    const row = await getPublicSiteLogo();
    return Response.json({ global: { hasLogo: Boolean(row?.logoKey), updatedAt: row?.updatedAt ?? null } });
  } catch (reason) {
    return accessErrorResponse(reason, "Logo belum dapat dimuat.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireKetua();
    const form = await request.formData();
    const target = parseTarget(form.get("target"));
    const file = form.get("file");
    if (!target || !(file instanceof File)) return Response.json({ error: "Permintaan unggah logo tidak valid." }, { status: 400 });
    if (!LOGO_UPLOAD_TYPES.includes(file.type as (typeof LOGO_UPLOAD_TYPES)[number])) {
      return Response.json({ error: "Format logo harus PNG, JPG, atau WebP." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > LOGO_UPLOAD_MAX_BYTES) return Response.json({ error: "Ukuran logo maksimal 5 MB." }, { status: 400 });

    const { saveAttendanceFile } = await import("@/db/attendance");
    const optimized = await optimizeLogo(file);

    if (target === "global") {
      const key = await saveAttendanceFile("public-site/logo/global", optimized);
      await setPublicSiteLogoKey(key, user.id);
      // File logo lama tetap disimpan di R2 (tidak dihapus otomatis).
      return Response.json({ success: true, target, previousFile: "kept" });
    }

    const id = await ensureChromeSection(target, user.id);
    const key = await saveAttendanceFile(`public-site/logo/${target}`, optimized);
    await setPublicSiteSectionImage(id, key, optimized.name.slice(0, 180), optimized.type, user.id);
    await setDraftLogoMode(target, id, "custom", user.id);
    // File lama tetap disimpan di R2 (tidak dihapus otomatis) — versi published/snapshot tetap utuh.
    return Response.json({ success: true, target, id, previousFile: "kept" });
  } catch (reason) {
    return accessErrorResponse(reason, "Logo belum dapat diunggah.");
  }
}

/** Hapus Logo Utama, atau lepas logo khusus header/footer dari draft (kembali ke Logo Utama). */
export async function DELETE(request: Request) {
  try {
    const user = await requireKetua();
    let body: Record<string, unknown> = {};
    try { body = await request.json(); } catch { body = {}; }
    const target = parseTarget(body.target);
    if (!target) return Response.json({ error: "Target logo tidak valid." }, { status: 400 });
    if (target === "global") {
      const previous = await getPublicSiteLogo();
      if (!previous?.logoKey) return Response.json({ success: true, target, previousFile: "skipped" });
      await setPublicSiteLogoKey(null, user.id);
      // Hanya referensi yang dilepas; objek R2 tetap disimpan.
      return Response.json({ success: true, target, previousFile: "kept" });
    }

    const section = await getChromeSectionForAdmin(target);
    if (!section) return Response.json({ success: true, target, previousFile: "skipped" });
    await clearPublicSiteSectionImage(section.id, user.id);
    await setDraftLogoMode(target, section.id, "inherit", user.id);
    // Hanya referensi draft yang dilepas; objek R2 tetap disimpan (versi published tidak rusak).
    return Response.json({ success: true, target, previousFile: "kept" });
  } catch (reason) {
    return accessErrorResponse(reason, "Logo belum dapat dihapus.");
  }
}
