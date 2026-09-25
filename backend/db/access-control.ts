import { env } from "@/lib/runtime-env";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import type { AccessUser, AppAccess } from "@/lib/access-types";
import { isSuperAdmin } from "@/lib/super-admin";

// Email admin utama: dari env BOOTSTRAP_ADMIN_EMAIL (Coolify), fallback ke nilai lama.
const BOOTSTRAP_ADMIN_EMAIL = (process.env.BOOTSTRAP_ADMIN_EMAIL || "agustrnt@gmail.com").trim().toLowerCase();
const IS_VPS_RUNTIME = process.env.TDA_RUNTIME !== "chatgpt";

type UserRow = AccessUser & { isActive: number };

function getD1() {
  if (!env.DB) throw new Error("Database belum tersedia");
  return env.DB;
}

function isMembershipDivision(user?: AccessUser | null) {
  if (!user?.divisionName) return false;
  const name = user.divisionName.toLowerCase().replace(/&/g, "dan");
  return name.includes("pelayanan anggota") && name.includes("data");
}

function permissionsFor(user?: AccessUser | null) {
  const role = user?.role;
  return {
    manageUsers: role === "ketua_ksb" || isSuperAdmin(user),
    // Manajemen akun login HANYA milik Super Admin (berdasarkan email, bukan role).
    manageAccounts: isSuperAdmin(user),
    manageAllPrograms: role === "ketua_ksb",
    manageOwnDivision: role === "kadiv",
    writePrograms: role === "ketua_ksb" || role === "kadiv",
    manageTreasury: role === "ketua_ksb" || role === "bendahara",
    manageMembership: role === "ketua_ksb" || (role === "kadiv" && isMembershipDivision(user)),
  };
}

async function findActiveUser(email: string) {
  return getD1().prepare(`SELECT u.id, u.name, u.email, u.role, u.division_id AS divisionId,
    d.name AS divisionName, u.is_active AS isActive
    FROM users u LEFT JOIN divisions d ON d.id = u.division_id
    WHERE LOWER(u.email) = LOWER(?) LIMIT 1`).bind(email).first<UserRow>();
}

async function ensureBootstrapAdmin(name: string, email: string) {
  if (email.toLowerCase() !== BOOTSTRAP_ADMIN_EMAIL) return;
  await getD1().prepare(`INSERT INTO users (name, email, role, division_id, is_active, updated_at)
    VALUES (?, ?, 'ketua_ksb', NULL, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(email) DO UPDATE SET name = excluded.name, role = 'ketua_ksb',
      is_active = 1, updated_at = CURRENT_TIMESTAMP`).bind(name, email.toLowerCase()).run();
}

/** Sesi ada tetapi akun masih memakai password sementara (must_change_password = 1). */
async function sessionRequiresPasswordChange() {
  if (!IS_VPS_RUNTIME) return false;
  const { getVpsSessionIdentity } = await import("@/lib/vps-auth");
  const identity = await getVpsSessionIdentity().catch(() => null);
  return Boolean(identity?.mustChangePassword);
}

export async function getCurrentAccess(): Promise<AppAccess> {
  const identity = await getChatGPTUser();
  if (!identity) {
    return {
      authenticated: false,
      registered: false,
      identity: null,
      user: null,
      isSuperAdmin: false,
      passwordChangeRequired: await sessionRequiresPasswordChange(),
      permissions: permissionsFor(),
    };
  }

  const email = identity.email.trim().toLowerCase();
  const name = identity.fullName?.trim() || identity.displayName.trim() || email;
  let row = await findActiveUser(email);
  if (!row && email === BOOTSTRAP_ADMIN_EMAIL) {
    await ensureBootstrapAdmin(name, email);
    row = await findActiveUser(email);
  }
  const active = row && Boolean(row.isActive);
  const user = active ? {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    divisionId: row.divisionId,
    divisionName: row.divisionName,
  } : null;

  return {
    authenticated: true,
    registered: Boolean(user),
    identity: { name, email },
    user,
    isSuperAdmin: isSuperAdmin(user),
    passwordChangeRequired: false,
    permissions: permissionsFor(user),
  };
}

export class AccessError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

export async function requireRegisteredUser() {
  const access = await getCurrentAccess();
  if (access.passwordChangeRequired) {
    throw new AccessError("Anda masih menggunakan password sementara. Silakan buat password baru sebelum melanjutkan.", 403);
  }
  if (!access.authenticated) throw new AccessError("Silakan masuk untuk mengubah data.", 401);
  if (!access.user) throw new AccessError("Akun Anda belum terdaftar atau sedang dinonaktifkan.");
  return access.user;
}

export async function requireKetua() {
  const user = await requireRegisteredUser();
  if (user.role !== "ketua_ksb") throw new AccessError("Hanya Ketua/KSB yang dapat mengelola Master Pengurus.");
  return user;
}

/** Melihat daftar Master Pengurus (tanpa aksi): Ketua/KSB atau Super Admin. */
export async function requireUserDirectoryViewer() {
  const user = await requireRegisteredUser();
  if (user.role !== "ketua_ksb" && !isSuperAdmin(user)) {
    throw new AccessError("Hanya Ketua/KSB yang dapat melihat Master Pengurus.");
  }
  return user;
}

/** Manajemen akun login pengurus — HANYA Super Admin (agustrnt@gmail.com). */
export async function requireSuperAdmin() {
  const user = await requireRegisteredUser();
  if (!isSuperAdmin(user)) {
    throw new AccessError("Hanya Super Admin yang dapat mengelola akun pengurus.", 403);
  }
  return user;
}

export async function requireTreasuryManager() {
  const user = await requireRegisteredUser();
  if (user.role !== "ketua_ksb" && user.role !== "bendahara") {
    throw new AccessError("Hanya Ketua/KSB dan Bendahara yang dapat mengelola buku besar.");
  }
  return user;
}

export async function requireMembershipManager() {
  const user = await requireRegisteredUser();
  if (user.role !== "ketua_ksb" && !(user.role === "kadiv" && isMembershipDivision(user))) {
    throw new AccessError("Hanya Ketua/KSB dan Divisi Pelayanan Anggota & Data yang dapat mengelola pendaftaran member.");
  }
  return user;
}

export function assertCanManageDivision(user: AccessUser, divisionId: number) {
  if (user.role === "ketua_ksb") return;
  if (user.role === "kadiv" && user.divisionId === divisionId) return;
  throw new AccessError("Anda hanya dapat mengelola program kerja pada divisi sendiri.");
}

export function accessErrorResponse(reason: unknown, fallback: string) {
  if (reason instanceof AccessError) return Response.json({ error: reason.message }, { status: reason.status });
  return Response.json({ error: fallback }, { status: 500 });
}
