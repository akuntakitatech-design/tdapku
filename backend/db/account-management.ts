/**
 * Manajemen akun login pengurus (khusus Super Admin).
 *
 * Dua tabel terlibat:
 * - `users`             : profil + role pengurus. Dirujuk FK tabel bisnis/historis (program, approval,
 *                         transaksi, LPJ, kehadiran, activity log, dll.) TANPA cascade.
 * - `vps_auth_accounts` : kredensial login (hash scrypt), is_active, must_change_password.
 *
 * Strategi hapus = SOFT DELETE profil + HAPUS KREDENSIAL LOGIN:
 *   users.deleted_at = NOW, users.is_active = 0 (baris & nama tetap ada → histori/relasi utuh),
 *   baris vps_auth_accounts dihapus (hash password hilang; sesi ikut terhapus lewat FK auth).
 *   Tidak ada tabel bisnis yang disentuh.
 *
 * Semua query di sini native MariaDB (seperti lib/vps-auth.ts) karena harus dalam satu transaksi
 * lintas tabel profil & auth. Password hash TIDAK PERNAH dikembalikan ke pemanggil.
 */
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { UserRole } from "@/lib/access-types";
import { mariaDb } from "@/lib/db/mariadb-d1";
import { isSuperAdminEmail, normalizeEmailForComparison } from "@/lib/super-admin";

export const ACCOUNT_ROLES: UserRole[] = ["ketua_ksb", "bendahara", "kadiv", "viewer"];

export type AccountStatus = "active" | "must_change_password" | "inactive";

export type ManagedAccount = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  divisionId: number | null;
  divisionName: string | null;
  isActive: boolean;
  hasLogin: boolean;
  loginActive: boolean;
  mustChangePassword: boolean;
  neverLoggedIn: boolean;
  lastLoginAt: string | null;
  isSuperAdmin: boolean;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
};

export type AccountProfileInput = {
  name: string;
  email: string;
  role: UserRole;
  divisionId: number | null;
};

export class AccountError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

type AccountRow = RowDataPacket & {
  id: number;
  name: string;
  email: string | null;
  role: UserRole;
  divisionId: number | null;
  divisionName: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
  authEmail: string | null;
  loginActive: number | null;
  mustChangePassword: number | null;
  lastLoginAt: Date | string | null;
};

// Format kolom created_at/updated_at tabel users (VARCHAR, UTC) — sama dengan default skema.
const USERS_NOW = "DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')";

const SELECT_ACCOUNTS = `SELECT u.id, u.name, u.email, u.role, u.division_id AS divisionId, d.name AS divisionName,
    u.is_active AS isActive, u.created_at AS createdAt, u.updated_at AS updatedAt,
    a.email AS authEmail, a.is_active AS loginActive, a.must_change_password AS mustChangePassword,
    a.last_login_at AS lastLoginAt
  FROM users u
  LEFT JOIN divisions d ON d.id = u.division_id
  LEFT JOIN vps_auth_accounts a ON a.email = LOWER(TRIM(u.email))`;

function toIso(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(`${String(value).replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function toAccount(row: AccountRow): ManagedAccount {
  const isActive = Boolean(Number(row.isActive));
  const hasLogin = Boolean(row.authEmail);
  const loginActive = hasLogin && Boolean(Number(row.loginActive));
  const mustChangePassword = hasLogin && Boolean(Number(row.mustChangePassword));
  const status: AccountStatus = !isActive || (hasLogin && !loginActive) ? "inactive" : mustChangePassword ? "must_change_password" : "active";
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email ?? "",
    role: row.role,
    divisionId: row.divisionId === null ? null : Number(row.divisionId),
    divisionName: row.divisionName,
    isActive,
    hasLogin,
    loginActive,
    mustChangePassword,
    neverLoggedIn: hasLogin && !row.lastLoginAt,
    lastLoginAt: toIso(row.lastLoginAt),
    isSuperAdmin: isSuperAdminEmail(row.email),
    status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function rows<T extends RowDataPacket>(connection: PoolConnection, sql: string, values: unknown[] = []) {
  const [result] = await connection.query<T[]>(sql, values);
  return result;
}

async function exec(connection: PoolConnection, sql: string, values: unknown[] = []) {
  const [result] = await connection.query<ResultSetHeader>(sql, values);
  return result;
}

/** Daftar akun yang belum dihapus. Kolom password_hash tidak pernah dipilih. */
export async function listAccounts() {
  const result = await mariaDb.query<AccountRow>(`${SELECT_ACCOUNTS}
    WHERE u.deleted_at IS NULL
    ORDER BY u.is_active DESC,
      CASE u.role WHEN 'ketua_ksb' THEN 1 WHEN 'bendahara' THEN 2 WHEN 'kadiv' THEN 3 ELSE 4 END,
      u.name`);
  return result.rows.map(toAccount);
}

export async function getAccount(id: number) {
  const result = await mariaDb.query<AccountRow>(`${SELECT_ACCOUNTS} WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1`, [id]);
  return result.rows[0] ? toAccount(result.rows[0]) : null;
}

async function lockTarget(connection: PoolConnection, id: number) {
  const [target] = await rows<AccountRow>(connection, `${SELECT_ACCOUNTS} WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1 FOR UPDATE`, [id]);
  if (!target) throw new AccountError("Pengurus tidak ditemukan.", 404);
  return target;
}

/** Proteksi mutlak: akun Super Admin tidak boleh diubah lewat manajemen akun. */
function assertNotSuperAdmin(target: AccountRow, action: string) {
  if (isSuperAdminEmail(target.email)) {
    throw new AccountError(`Akun Super Admin tidak dapat ${action}.`, 403);
  }
}

async function assertEmailAvailable(connection: PoolConnection, email: string, exceptUserId?: number) {
  const users = await rows<RowDataPacket & { id: number; deletedAt: string | null }>(
    connection,
    `SELECT id, deleted_at AS deletedAt FROM users WHERE LOWER(TRIM(email)) = ? ${exceptUserId ? "AND id <> ?" : ""} LIMIT 1`,
    exceptUserId ? [email, exceptUserId] : [email],
  );
  if (!users.length) return;
  // Email milik akun yang sudah dihapus (soft delete): tidak bisa dipakai akun lain (users_email_unique),
  // tetapi dapat diaktifkan kembali lewat "Tambah Pengurus".
  if (users[0].deletedAt) {
    throw new AccountError("Email tersebut milik akun pengurus yang sudah dihapus. Gunakan Tambah Pengurus untuk mengaktifkannya kembali.", 409);
  }
  throw new AccountError("Email tersebut sudah terdaftar.", 409);
}

export type CreateAccountResult = { user: ManagedAccount | null; reactivated: boolean };

/**
 * Tambah pengurus + akun login dengan password sementara (must_change_password = 1).
 *
 * - Email belum pernah ada            → buat baris `users` + `vps_auth_accounts` baru.
 * - Email ada & belum dihapus         → tolak "Email tersebut sudah terdaftar." (termasuk akun nonaktif;
 *                                       akun nonaktif diaktifkan dari tombol "Aktifkan" di daftar).
 * - Email ada & sudah dihapus (soft)  → REAKTIVASI baris `users` yang sama (ID & seluruh histori dipertahankan):
 *                                       deleted_at = NULL, is_active = 1, profil/role/divisi dari form terbaru,
 *                                       kredensial login dibuat/di-reset ke password sementara + wajib ganti,
 *                                       sesi lama dicabut. Tidak ada baris baru, tidak ada histori yang dihapus.
 */
export async function createAccount(input: AccountProfileInput, tempPasswordHash: string): Promise<CreateAccountResult> {
  const email = normalizeEmailForComparison(input.email);
  if (isSuperAdminEmail(email)) throw new AccountError("Email Super Admin tidak dapat didaftarkan ulang.", 403);
  const result = await mariaDb.transaction(async (connection) => {
    const [existing] = await rows<RowDataPacket & { id: number; deletedAt: string | null }>(
      connection,
      `SELECT id, deleted_at AS deletedAt FROM users WHERE LOWER(TRIM(email)) = ? ORDER BY id LIMIT 1 FOR UPDATE`,
      [email],
    );
    if (existing && !existing.deletedAt) throw new AccountError("Email tersebut sudah terdaftar.", 409);

    if (existing) {
      const id = Number(existing.id);
      await exec(
        connection,
        `UPDATE users SET name = ?, email = ?, role = ?, division_id = ?, is_active = 1, deleted_at = NULL, updated_at = ${USERS_NOW} WHERE id = ?`,
        [input.name, email, input.role, input.divisionId, id],
      );
      const [auth] = await rows<RowDataPacket>(connection, `SELECT email FROM vps_auth_accounts WHERE email = ? LIMIT 1 FOR UPDATE`, [email]);
      if (auth) {
        // Sisa kredensial lama (jika ada): reset ke password sementara, aktifkan, cabut sesi lama.
        await exec(
          connection,
          `UPDATE vps_auth_accounts SET display_name = ?, password_hash = ?, is_active = 1, must_change_password = 1, failed_attempts = 0, locked_until = NULL, updated_at = NOW(3) WHERE email = ?`,
          [input.name, tempPasswordHash, email],
        );
        await exec(connection, `UPDATE vps_auth_sessions SET revoked_at = NOW(3) WHERE email = ? AND revoked_at IS NULL`, [email]);
      } else {
        await exec(
          connection,
          `INSERT INTO vps_auth_accounts (email, display_name, password_hash, is_active, must_change_password) VALUES (?, ?, ?, 1, 1)`,
          [email, input.name, tempPasswordHash],
        );
      }
      return { id, reactivated: true };
    }

    const auth = await rows<RowDataPacket>(connection, `SELECT email FROM vps_auth_accounts WHERE email = ? LIMIT 1`, [email]);
    if (auth.length) throw new AccountError("Email tersebut sudah memiliki akun login.", 409);
    const inserted = await exec(
      connection,
      `INSERT INTO users (name, email, role, division_id, is_active, updated_at) VALUES (?, ?, ?, ?, 1, ${USERS_NOW})`,
      [input.name, email, input.role, input.divisionId],
    );
    await exec(
      connection,
      `INSERT INTO vps_auth_accounts (email, display_name, password_hash, is_active, must_change_password) VALUES (?, ?, ?, 1, 1)`,
      [email, input.name, tempPasswordHash],
    );
    return { id: Number(inserted.insertId), reactivated: false };
  });
  return { user: await getAccount(result.id), reactivated: result.reactivated };
}

/**
 * Edit profil pengurus (nama, email, role, divisi) — bukan untuk Super Admin.
 * Jika email berubah, akun login ikut dipindah ke email baru dan sesi lama dicabut.
 */
export async function updateAccountProfile(id: number, input: AccountProfileInput) {
  const email = normalizeEmailForComparison(input.email);
  await mariaDb.transaction(async (connection) => {
    const target = await lockTarget(connection, id);
    assertNotSuperAdmin(target, "diubah");
    if (isSuperAdminEmail(email)) throw new AccountError("Email Super Admin tidak dapat dipakai akun lain.", 403);
    const oldEmail = normalizeEmailForComparison(target.email);
    if (email !== oldEmail) {
      await assertEmailAvailable(connection, email, id);
      const taken = await rows<RowDataPacket>(connection, `SELECT email FROM vps_auth_accounts WHERE email = ? LIMIT 1`, [email]);
      if (taken.length) throw new AccountError("Email tersebut sudah memiliki akun login.", 409);
      if (target.authEmail) {
        await exec(connection, `DELETE FROM vps_auth_sessions WHERE email = ?`, [target.authEmail]);
        await exec(connection, `UPDATE vps_auth_accounts SET email = ?, updated_at = NOW(3) WHERE email = ?`, [email, target.authEmail]);
      }
    }
    await exec(
      connection,
      `UPDATE users SET name = ?, email = ?, role = ?, division_id = ?, updated_at = ${USERS_NOW} WHERE id = ?`,
      [input.name, email, input.role, input.divisionId, id],
    );
  });
  return getAccount(id);
}

/** Reset password ke password sementara + wajib ganti + cabut semua sesi lama. */
export async function resetAccountPassword(id: number, tempPasswordHash: string) {
  await mariaDb.transaction(async (connection) => {
    const target = await lockTarget(connection, id);
    assertNotSuperAdmin(target, "direset password-nya");
    const email = normalizeEmailForComparison(target.email);
    if (!email) throw new AccountError("Pengurus ini belum memiliki email.", 400);
    if (target.authEmail) {
      await exec(
        connection,
        `UPDATE vps_auth_accounts SET password_hash = ?, must_change_password = 1, failed_attempts = 0, locked_until = NULL, updated_at = NOW(3) WHERE email = ?`,
        [tempPasswordHash, target.authEmail],
      );
      await exec(connection, `UPDATE vps_auth_sessions SET revoked_at = NOW(3) WHERE email = ? AND revoked_at IS NULL`, [target.authEmail]);
    } else {
      // Pengurus lama tanpa akun login: buat kredensial baru (status login mengikuti status pengurus).
      await exec(
        connection,
        `INSERT INTO vps_auth_accounts (email, display_name, password_hash, is_active, must_change_password) VALUES (?, ?, ?, ?, 1)`,
        [email, target.name, tempPasswordHash, Number(target.isActive) ? 1 : 0],
      );
    }
  });
  return getAccount(id);
}

/** Aktifkan / nonaktifkan akun (profil + login). Nonaktif = tidak bisa login, sesi dicabut. */
export async function setAccountActive(id: number, active: boolean) {
  await mariaDb.transaction(async (connection) => {
    const target = await lockTarget(connection, id);
    assertNotSuperAdmin(target, active ? "diubah statusnya" : "dinonaktifkan");
    await exec(connection, `UPDATE users SET is_active = ?, updated_at = ${USERS_NOW} WHERE id = ?`, [active ? 1 : 0, id]);
    if (target.authEmail) {
      await exec(
        connection,
        active
          ? `UPDATE vps_auth_accounts SET is_active = 1, failed_attempts = 0, locked_until = NULL, updated_at = NOW(3) WHERE email = ?`
          : `UPDATE vps_auth_accounts SET is_active = 0, updated_at = NOW(3) WHERE email = ?`,
        [target.authEmail],
      );
      if (!active) {
        await exec(connection, `UPDATE vps_auth_sessions SET revoked_at = NOW(3) WHERE email = ? AND revoked_at IS NULL`, [target.authEmail]);
      }
    }
  });
  return getAccount(id);
}

/**
 * Hapus user: soft delete profil (baris `users` TIDAK dihapus agar seluruh relasi historis tetap
 * menunjuk ke nama yang sama) + hapus kredensial login. Tidak menyentuh tabel bisnis mana pun.
 */
export async function deleteAccount(id: number) {
  await mariaDb.transaction(async (connection) => {
    const target = await lockTarget(connection, id);
    assertNotSuperAdmin(target, "dihapus");
    await exec(connection, `UPDATE users SET is_active = 0, deleted_at = UTC_TIMESTAMP(3), updated_at = ${USERS_NOW} WHERE id = ?`, [id]);
    if (target.authEmail) {
      await exec(connection, `DELETE FROM vps_auth_sessions WHERE email = ?`, [target.authEmail]);
      await exec(connection, `DELETE FROM vps_auth_accounts WHERE email = ?`, [target.authEmail]);
    }
  });
}
