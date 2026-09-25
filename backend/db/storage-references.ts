import { env } from "@/lib/runtime-env";

/*
 * Pengaman penghapusan objek R2/S3 (Website 01).
 * PRINSIP: DATA SAFETY > STORAGE CLEANUP.
 * Objek hanya boleh dihapus bila kuncinya TIDAK lagi direferensikan di mana pun
 * (working copy/draft, snapshot live `__published`, section lain, hero slider, kartu program,
 * public_site_settings, public_media banner/galeri, submission Direktori/Testimoni).
 * Jika pengecekan gagal/ragu → JANGAN hapus (file yatim lebih aman daripada gambar live rusak).
 * Tidak ada cleanup massal: fungsi ini hanya dipanggil untuk satu kunci yang baru diganti/dihapus admin.
 */

function db() {
  if (!env.DB) throw new Error("Database belum tersedia");
  return env.DB;
}

const REFERENCE_CHECKS: Array<[label: string, sql: string, params: number]> = [
  ["public_site_sections", "SELECT COUNT(*) AS n FROM public_site_sections WHERE image_key = ? OR INSTR(COALESCE(content_json, ''), ?) > 0", 2],
  ["public_site_settings", "SELECT COUNT(*) AS n FROM public_site_settings WHERE logo_key = ? OR favicon_key = ?", 2],
  ["public_media", "SELECT COUNT(*) AS n FROM public_media WHERE image_key = ?", 1],
  ["public_member_submissions", "SELECT COUNT(*) AS n FROM public_member_submissions WHERE logo_key = ? OR business_photo_key = ? OR profile_photo_key = ?", 3],
  ["program_publications", "SELECT COUNT(*) AS n FROM program_publications WHERE flyer_key = ?", 1],
  ["attendance_events", "SELECT COUNT(*) AS n FROM attendance_events WHERE flyer_key = ? OR qris_key = ?", 2],
];

/** Daftar tempat yang masih mereferensikan kunci. Melempar error bila pengecekan tidak dapat dipastikan. */
export async function findStorageKeyReferences(key: string) {
  const found: string[] = [];
  for (const [label, sql, params] of REFERENCE_CHECKS) {
    const row = await db()
      .prepare(sql)
      .bind(...Array(params).fill(key))
      .first<{ n: number | string }>();
    if (Number(row?.n ?? 0) > 0) found.push(label);
  }
  return found;
}

/**
 * Hapus objek HANYA bila sudah tidak direferensikan. Panggil SETELAH record diperbarui.
 * Mengembalikan status agar tercatat di log server (tanpa membocorkan kunci ke klien).
 */
export async function deleteStorageObjectIfUnreferenced(
  key: string | null | undefined,
  remove: (key: string) => Promise<unknown>,
): Promise<"deleted" | "kept-referenced" | "kept-unverified" | "skipped"> {
  if (!key || typeof key !== "string") return "skipped";
  let references: string[];
  try {
    references = await findStorageKeyReferences(key);
  } catch (reason) {
    console.warn("[storage-safety] referensi tidak dapat dipastikan, file dipertahankan:", reason instanceof Error ? reason.message : reason);
    return "kept-unverified";
  }
  if (references.length) {
    console.info(`[storage-safety] file dipertahankan, masih dipakai di: ${references.join(", ")}`);
    return "kept-referenced";
  }
  try {
    await remove(key);
    return "deleted";
  } catch {
    return "kept-unverified";
  }
}
