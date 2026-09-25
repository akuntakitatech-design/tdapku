#!/usr/bin/env node
/**
 * Set password SEMENTARA untuk seluruh akun login pengurus SELAIN Super Admin (agustrnt@gmail.com).
 *
 * Yang diubah (HANYA field autentikasi):
 *   vps_auth_accounts.password_hash        → hash scrypt-v1 dari DEFAULT_TEMP_PASSWORD (salt unik per akun)
 *   vps_auth_accounts.must_change_password → 1
 *   vps_auth_accounts.failed_attempts / locked_until / updated_at (reset penguncian)
 *   vps_auth_sessions.revoked_at           → sesi lama dicabut (user wajib login ulang)
 * TIDAK menyentuh tabel users (nama, email, role, divisi, status) maupun tabel bisnis apa pun.
 * Akun Super Admin dikecualikan di query (perbandingan email ternormalisasi).
 *
 * Pemakaian (env DATABASE_URL, AUTH_PASSWORD_PEPPER, DEFAULT_TEMP_PASSWORD wajib):
 *   node scripts/reset-temp-passwords.mjs            # dry-run: hanya menampilkan akun yang akan diubah
 *   node scripts/reset-temp-passwords.mjs --apply    # jalankan
 * Password tidak pernah dicetak ke log.
 */
import { randomBytes, scrypt } from "node:crypto";
import { readFileSync } from "node:fs";
import process from "node:process";
import mysql from "mysql2/promise";

const SUPER_ADMIN_EMAIL = "agustrnt@gmail.com";
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };

function readPepper() {
  const file = process.env.AUTH_PASSWORD_PEPPER_FILE;
  if (file) {
    const value = readFileSync(file, "utf8").trim();
    if (value) return value;
  }
  const direct = process.env.AUTH_PASSWORD_PEPPER?.trim();
  if (direct) return direct;
  throw new Error("AUTH_PASSWORD_PEPPER (atau AUTH_PASSWORD_PEPPER_FILE) belum dikonfigurasi.");
}

function hashPassword(password, pepper) {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    scrypt(`${password}\u0000${pepper}`, salt, 64, SCRYPT, (error, derived) => {
      if (error) reject(error);
      else resolve(["scrypt-v1", String(SCRYPT.N), String(SCRYPT.r), String(SCRYPT.p), salt.toString("base64url"), Buffer.from(derived).toString("base64url")].join("$"));
    });
  });
}

async function main() {
  const apply = process.argv.includes("--apply");
  const tempPassword = process.env.DEFAULT_TEMP_PASSWORD;
  if (!tempPassword || tempPassword.length < 12) throw new Error("DEFAULT_TEMP_PASSWORD belum dikonfigurasi (minimal 12 karakter).");
  const pepper = readPepper();
  const url = new URL(process.env.DATABASE_URL || "");
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    timezone: "Z",
  });
  try {
    const [targets] = await connection.query(
      `SELECT a.email, a.must_change_password AS mustChange, a.is_active AS isActive
         FROM vps_auth_accounts a
        WHERE LOWER(TRIM(a.email)) <> ?
        ORDER BY a.email`,
      [SUPER_ADMIN_EMAIL],
    );
    const [missing] = await connection.query(
      `SELECT u.id, u.email FROM users u
         LEFT JOIN vps_auth_accounts a ON a.email = LOWER(TRIM(u.email))
        WHERE a.email IS NULL AND u.email IS NOT NULL AND LOWER(TRIM(u.email)) <> ?`,
      [SUPER_ADMIN_EMAIL],
    );
    console.log(`[reset-temp] mode=${apply ? "APPLY" : "DRY-RUN"} target=${targets.length} akun (Super Admin dikecualikan)`);
    for (const t of targets) console.log(`  - ${t.email} (aktif=${t.isActive}, wajib_ganti_sebelumnya=${t.mustChange})`);
    if (missing.length) console.log(`[reset-temp] ${missing.length} pengurus tanpa akun login dilewati: ${missing.map((m) => m.email).join(", ")}`);
    if (!apply) {
      console.log("[reset-temp] dry-run selesai. Jalankan ulang dengan --apply untuk menerapkan.");
      return;
    }
    await connection.beginTransaction();
    let updated = 0;
    let revoked = 0;
    for (const t of targets) {
      if (String(t.email).trim().toLowerCase() === SUPER_ADMIN_EMAIL) continue; // pengaman ganda
      const hash = await hashPassword(tempPassword, pepper);
      const [result] = await connection.query(
        `UPDATE vps_auth_accounts
            SET password_hash = ?, must_change_password = 1, failed_attempts = 0, locked_until = NULL, updated_at = NOW(3)
          WHERE email = ? AND LOWER(TRIM(email)) <> ?`,
        [hash, t.email, SUPER_ADMIN_EMAIL],
      );
      updated += result.affectedRows;
      const [sessions] = await connection.query(
        `UPDATE vps_auth_sessions SET revoked_at = NOW(3) WHERE email = ? AND revoked_at IS NULL`,
        [t.email],
      );
      revoked += sessions.affectedRows;
    }
    await connection.commit();
    console.log(`[reset-temp] selesai: ${updated} akun diperbarui, ${revoked} sesi lama dicabut.`);
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`[reset-temp] gagal: ${error.message}`);
  process.exit(1);
});
