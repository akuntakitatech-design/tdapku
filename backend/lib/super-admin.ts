/**
 * Super Admin utama TDA Pekanbaru 9.0.
 *
 * Hanya akun ini yang boleh mengelola akun login pengurus (tambah, edit, reset password,
 * aktif/nonaktif, hapus). Sengaja TIDAK memakai role (Ketua/KSB) maupun env agar hak ini
 * tidak dapat berpindah karena perubahan role atau konfigurasi.
 *
 * Normalisasi email hanya untuk PERBANDINGAN — email di database tidak pernah diubah.
 */
export const SUPER_ADMIN_EMAIL = "agustrnt@gmail.com";

export function normalizeEmailForComparison(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

export function isSuperAdminEmail(email: string | null | undefined) {
  return normalizeEmailForComparison(email) === SUPER_ADMIN_EMAIL;
}

export function isSuperAdmin(user: { email?: string | null } | null | undefined) {
  return Boolean(user) && isSuperAdminEmail(user?.email);
}
