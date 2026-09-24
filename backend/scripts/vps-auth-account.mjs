#!/usr/bin/env node
/**
 * Kelola akun login pengurus di MariaDB (tabel vps_auth_accounts).
 * Format hash scrypt-v1 + pepper identik dengan lib/vps-auth.ts.
 *
 * Pemakaian (DATABASE_URL + AUTH_PASSWORD_PEPPER / AUTH_PASSWORD_PEPPER_FILE wajib di env):
 *   echo 'PasswordBaruYangKuat' | node scripts/vps-auth-account.mjs set-password <email> [nama tampilan] [--must-change]
 *   node scripts/vps-auth-account.mjs enable <email>
 *   node scripts/vps-auth-account.mjs disable <email>
 *   node scripts/vps-auth-account.mjs status <email>
 *
 * Password selalu dibaca dari stdin — jangan taruh password di argumen perintah.
 */
import { randomBytes, scrypt } from "node:crypto";
import { readFileSync } from "node:fs";
import process from "node:process";
import mysql from "mysql2/promise";

const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;

function usage() {
  console.error(`Usage:
  node scripts/vps-auth-account.mjs set-password <email> [display name] [--must-change]
  node scripts/vps-auth-account.mjs enable <email>
  node scripts/vps-auth-account.mjs disable <email>
  node scripts/vps-auth-account.mjs status <email>

For set-password, provide the password through stdin. Never put a password in the command line.`);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

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

function scryptAsync(input, salt) {
  return new Promise((resolve, reject) => {
    scrypt(input, salt, SCRYPT_KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 128 * 1024 * 1024 }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

async function hashPassword(password, pepper) {
  if (password.length < 12 || password.length > 256) {
    throw new Error("Password harus 12-256 karakter.");
  }
  const salt = randomBytes(16);
  const derived = await scryptAsync(`${password}\u0000${pepper}`, salt);
  return ["scrypt-v1", String(SCRYPT_N), String(SCRYPT_R), String(SCRYPT_P), salt.toString("base64url"), Buffer.from(derived).toString("base64url")].join("$");
}

async function readPasswordFromStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").replace(/[\r\n]+$/, "");
}

export function createPool() {
  const url = new URL(process.env.DATABASE_URL || "");
  if (!url.hostname) throw new Error("DATABASE_URL belum dikonfigurasi.");
  return mysql.createPool({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, "") || "default",
    connectionLimit: 2,
    timezone: "Z",
    charset: "utf8mb4",
  });
}

const isMain = process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url;
if (isMain) {
  const [command, emailRaw, ...rest] = process.argv.slice(2);
  const email = normalizeEmail(emailRaw);
  if (!command || !email || !email.includes("@")) {
    usage();
    process.exit(64);
  }

  const pool = createPool();
  try {
    if (command === "set-password") {
      const mustChange = rest.includes("--must-change") ? 1 : 0;
      const displayName = rest.filter((value) => value !== "--must-change").join(" ").trim();
      const password = await readPasswordFromStdin();
      const passwordHash = await hashPassword(password, readPepper());
      await pool.query(
        `INSERT INTO vps_auth_accounts
          (email, display_name, password_hash, is_active, must_change_password, failed_attempts, locked_until, updated_at)
         VALUES (?, ?, ?, 1, ?, 0, NULL, NOW(3))
         ON DUPLICATE KEY UPDATE
           display_name = CASE WHEN VALUES(display_name) <> '' THEN VALUES(display_name) ELSE vps_auth_accounts.display_name END,
           password_hash = VALUES(password_hash),
           is_active = 1,
           must_change_password = VALUES(must_change_password),
           failed_attempts = 0,
           locked_until = NULL,
           updated_at = NOW(3)`,
        [email, displayName, passwordHash, mustChange],
      );
      await pool.query(`UPDATE vps_auth_sessions SET revoked_at = NOW(3) WHERE email = ? AND revoked_at IS NULL`, [email]);
      console.log(`Password akun ${email} diperbarui. Sesi lama dicabut.`);
    } else if (command === "disable") {
      const [result] = await pool.query(`UPDATE vps_auth_accounts SET is_active = 0, updated_at = NOW(3) WHERE email = ?`, [email]);
      await pool.query(`UPDATE vps_auth_sessions SET revoked_at = NOW(3) WHERE email = ? AND revoked_at IS NULL`, [email]);
      console.log(result.affectedRows ? `Akun ${email} dinonaktifkan.` : "Akun tidak ditemukan.");
    } else if (command === "enable") {
      const [result] = await pool.query(
        `UPDATE vps_auth_accounts SET is_active = 1, failed_attempts = 0, locked_until = NULL, updated_at = NOW(3) WHERE email = ?`,
        [email],
      );
      console.log(result.affectedRows ? `Akun ${email} diaktifkan.` : "Akun tidak ditemukan.");
    } else if (command === "status") {
      const [rows] = await pool.query(
        `SELECT email, display_name, is_active, must_change_password, failed_attempts, locked_until, last_login_at, created_at, updated_at
           FROM vps_auth_accounts WHERE email = ?`,
        [email],
      );
      if (!rows[0]) console.log("Akun tidak ditemukan.");
      else console.table([rows[0]]);
    } else {
      usage();
      process.exitCode = 64;
    }
  } finally {
    await pool.end();
  }
}
