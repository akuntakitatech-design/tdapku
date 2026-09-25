/**
 * Autentikasi lokal (email + password scrypt+pepper, sesi di tabel vps_auth_sessions,
 * cookie httpOnly `tda_session`). Format hash & HMAC token identik dengan VPS staging,
 * sehingga akun dan password lama tetap valid selama AUTH_PASSWORD_PEPPER /
 * AUTH_SESSION_SECRET dibawa dari lingkungan lama.
 *
 * Penyimpanan: MariaDB via lib/db/mariadb-d1.ts (query langsung tanpa translasi).
 */
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { cookies } from "next/headers";
import { mariaDb } from "@/lib/db/mariadb-d1";

export const VPS_SESSION_COOKIE = "tda_session";
const DEFAULT_SESSION_TTL_HOURS = 12;
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;
const MAX_FAILED_PER_ACCOUNT = 5;
const ACCOUNT_LOCK_MINUTES = 15;
const MAX_FAILED_PER_IP = 20;

export type VpsSessionIdentity = {
  email: string;
  displayName: string;
  mustChangePassword: boolean;
};

type AccountRow = {
  email: string;
  display_name: string;
  password_hash: string;
  is_active: number;
  must_change_password: number;
  failed_attempts: number;
  locked_until: Date | string | null;
};

export class VpsAuthError extends Error {
  code: string;
  status: number;

  constructor(code: string, status = 401) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

let cachedSessionSecret: string | null = null;
let cachedPasswordPepper: string | null = null;

function readSecret(fileEnv: string, directEnv: string) {
  const file = process.env[fileEnv];
  if (file) {
    const value = readFileSync(file, "utf8").trim();
    if (value) return value;
  }
  const direct = process.env[directEnv]?.trim();
  if (direct) return direct;
  throw new Error(`${directEnv} (atau ${fileEnv}) belum dikonfigurasi.`);
}

function sessionSecret() {
  cachedSessionSecret ??= readSecret("AUTH_SESSION_SECRET_FILE", "AUTH_SESSION_SECRET");
  return cachedSessionSecret;
}

function passwordPepper() {
  cachedPasswordPepper ??= readSecret("AUTH_PASSWORD_PEPPER_FILE", "AUTH_PASSWORD_PEPPER");
  return cachedPasswordPepper;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function scryptAsync(input: string, salt: Buffer, keyLength = SCRYPT_KEY_LENGTH, n = SCRYPT_N, r = SCRYPT_R, p = SCRYPT_P) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(input, salt, keyLength, { N: n, r, p, maxmem: 128 * 1024 * 1024 }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey as Buffer);
    });
  });
}

function passwordInput(password: string) {
  return `${password}\u0000${passwordPepper()}`;
}

export async function hashVpsPassword(password: string) {
  if (password.length < 12 || password.length > 256) {
    throw new VpsAuthError("weak_password", 400);
  }
  const salt = randomBytes(16);
  const derived = await scryptAsync(passwordInput(password), salt);
  return ["scrypt-v1", String(SCRYPT_N), String(SCRYPT_R), String(SCRYPT_P), salt.toString("base64url"), derived.toString("base64url")].join("$");
}

/**
 * Password sementara awal untuk akun baru / hasil reset (env DEFAULT_TEMP_PASSWORD).
 * Tidak ada nilai bawaan di kode: bila env kosong, aksi gagal dengan pesan jelas.
 */
export function defaultTempPassword() {
  const value = process.env.DEFAULT_TEMP_PASSWORD;
  if (!value || !value.trim()) throw new VpsAuthError("temp_password_unconfigured", 500);
  return value;
}

function isDefaultTempPassword(password: string) {
  const value = process.env.DEFAULT_TEMP_PASSWORD;
  return Boolean(value && value.trim()) && password === value;
}

/** Hash password sementara (scrypt-v1 + pepper, sama seperti password biasa). */
export async function hashDefaultTempPassword() {
  return hashVpsPassword(defaultTempPassword());
}

async function verifyPassword(password: string, encoded: string) {
  const [version, nRaw, rRaw, pRaw, saltRaw, hashRaw] = encoded.split("$");
  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (
    version !== "scrypt-v1" ||
    !Number.isSafeInteger(n) || !Number.isSafeInteger(r) || !Number.isSafeInteger(p) ||
    n < 16384 || n > 131072 || r < 1 || r > 16 || p < 1 || p > 4 || !saltRaw || !hashRaw
  ) {
    return false;
  }
  try {
    const salt = Buffer.from(saltRaw, "base64url");
    const expected = Buffer.from(hashRaw, "base64url");
    const actual = await scryptAsync(passwordInput(password), salt, expected.length, n, r, p);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

async function consumeDummyPasswordWork(password: string) {
  await scryptAsync(passwordInput(password), Buffer.from("VDAuS2FtYW5UYVBla2FuYmFydQ", "base64url"));
}

function tokenHash(token: string) {
  return createHmac("sha256", sessionSecret()).update(token).digest("hex");
}

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function clientIpHash(request: Request) {
  return createHmac("sha256", sessionSecret()).update(clientIp(request)).digest("hex");
}

function ttlHours() {
  const value = Number(process.env.AUTH_SESSION_TTL_HOURS || DEFAULT_SESSION_TTL_HOURS);
  if (!Number.isFinite(value)) return DEFAULT_SESSION_TTL_HOURS;
  return Math.max(1, Math.min(720, value));
}

async function recordAttempt(email: string, ipHash: string, success: boolean) {
  await mariaDb.query(`INSERT INTO vps_auth_login_attempts (email, ip_hash, success) VALUES (?, ?, ?)`, [email, ipHash, success ? 1 : 0]);
}

export async function authenticateVpsAccount(request: Request, emailInput: string, password: string) {
  const email = normalizeEmail(emailInput);
  if (!email || email.length > 320 || !password || password.length > 1024) {
    throw new VpsAuthError("invalid_credentials");
  }

  const ipHash = clientIpHash(request);
  const ipFailures = await mariaDb.query<{ count: number }>(
    `SELECT COUNT(*) AS count FROM vps_auth_login_attempts
      WHERE ip_hash = ? AND success = 0 AND created_at > NOW(3) - INTERVAL 15 MINUTE`,
    [ipHash],
  );
  if (Number(ipFailures.rows[0]?.count || 0) >= MAX_FAILED_PER_IP) {
    throw new VpsAuthError("rate_limited", 429);
  }

  const accountResult = await mariaDb.query<AccountRow>(
    `SELECT email, display_name, password_hash, is_active, must_change_password, failed_attempts, locked_until
       FROM vps_auth_accounts WHERE email = ? LIMIT 1`,
    [email],
  );
  const account = accountResult.rows[0];

  if (!account) {
    await consumeDummyPasswordWork(password);
    await recordAttempt(email, ipHash, false);
    throw new VpsAuthError("invalid_credentials");
  }

  const lockedUntil = account.locked_until ? new Date(account.locked_until).getTime() : 0;
  if (lockedUntil > Date.now()) {
    await recordAttempt(email, ipHash, false);
    throw new VpsAuthError("locked", 429);
  }

  const valid = await verifyPassword(password, account.password_hash);
  if (!valid) {
    await recordAttempt(email, ipHash, false);
    await mariaDb.query(
      `UPDATE vps_auth_accounts
          SET failed_attempts = failed_attempts + 1,
              locked_until = CASE WHEN failed_attempts + 1 >= ? THEN NOW(3) + INTERVAL ? MINUTE ELSE locked_until END,
              updated_at = NOW(3)
        WHERE email = ?`,
      [MAX_FAILED_PER_ACCOUNT, ACCOUNT_LOCK_MINUTES, email],
    );
    throw new VpsAuthError("invalid_credentials");
  }

  if (!Number(account.is_active)) {
    await recordAttempt(email, ipHash, false);
    throw new VpsAuthError("invalid_credentials");
  }

  await recordAttempt(email, ipHash, true);
  await mariaDb.query(
    `UPDATE vps_auth_accounts SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW(3), updated_at = NOW(3) WHERE email = ?`,
    [email],
  );

  return {
    email,
    displayName: account.display_name || email,
    mustChangePassword: Boolean(Number(account.must_change_password)),
  } satisfies VpsSessionIdentity;
}

export async function createVpsSession(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlHours() * 60 * 60 * 1000);

  await mariaDb.query(`INSERT INTO vps_auth_sessions (token_hash, email, expires_at) VALUES (?, ?, ?)`, [tokenHash(token), email, expiresAt]);
  void mariaDb
    .query(
      `DELETE FROM vps_auth_sessions
        WHERE expires_at < NOW(3) - INTERVAL 7 DAY
           OR (revoked_at IS NOT NULL AND revoked_at < NOW(3) - INTERVAL 7 DAY)`,
    )
    .catch(() => undefined);

  return { token, expiresAt };
}

async function findSessionIdentity(token: string) {
  if (!token || token.length > 256) return null;
  const result = await mariaDb.query<{ email: string; display_name: string; must_change_password: number }>(
    `SELECT a.email, a.display_name, a.must_change_password
       FROM vps_auth_sessions s JOIN vps_auth_accounts a ON a.email = s.email
      WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > NOW(3) AND a.is_active = 1
      LIMIT 1`,
    [tokenHash(token)],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    email: row.email,
    displayName: row.display_name || row.email,
    mustChangePassword: Boolean(Number(row.must_change_password)),
  } satisfies VpsSessionIdentity;
}

export async function getVpsSessionIdentity() {
  const cookieStore = await cookies();
  const token = cookieStore.get(VPS_SESSION_COOKIE)?.value;
  return token ? findSessionIdentity(token) : null;
}

export async function revokeVpsSession(token: string | null | undefined) {
  if (!token) return;
  await mariaDb.query(`UPDATE vps_auth_sessions SET revoked_at = NOW(3) WHERE token_hash = ? AND revoked_at IS NULL`, [tokenHash(token)]);
}

/** Cabut semua sesi aktif sebuah akun (reset password / nonaktif / hapus). */
export async function revokeAllVpsSessions(emailInput: string) {
  await mariaDb.query(`UPDATE vps_auth_sessions SET revoked_at = NOW(3) WHERE email = ? AND revoked_at IS NULL`, [normalizeEmail(emailInput)]);
}

/**
 * Ganti password.
 * - Akun dengan must_change_password = 1 (login memakai password sementara): password saat ini
 *   tidak diminta lagi karena sesi yang valid sudah membuktikannya. Status dibaca dari DB, bukan dari klien.
 * - Akun biasa: password saat ini wajib benar.
 * Password baru tidak boleh sama dengan password sementara (DEFAULT_TEMP_PASSWORD).
 */
export async function changeVpsPassword(emailInput: string, currentPassword: string, newPassword: string) {
  const email = normalizeEmail(emailInput);
  const result = await mariaDb.query<{ password_hash: string; must_change_password: number }>(
    `SELECT password_hash, must_change_password FROM vps_auth_accounts WHERE email = ? AND is_active = 1 LIMIT 1`,
    [email],
  );
  const account = result.rows[0];
  if (!account) throw new VpsAuthError("invalid_current_password", 400);
  const forced = Boolean(Number(account.must_change_password));
  if (!forced && !(await verifyPassword(currentPassword, account.password_hash))) {
    throw new VpsAuthError("invalid_current_password", 400);
  }
  if (!newPassword.trim()) throw new VpsAuthError("weak_password", 400);
  if (isDefaultTempPassword(newPassword)) throw new VpsAuthError("temp_password_reuse", 400);

  const nextHash = await hashVpsPassword(newPassword);
  await mariaDb.transaction(async (connection) => {
    await connection.query(
      `UPDATE vps_auth_accounts SET password_hash = ?, must_change_password = 0, failed_attempts = 0, locked_until = NULL, updated_at = NOW(3) WHERE email = ?`,
      [nextHash, email],
    );
    await connection.query(`UPDATE vps_auth_sessions SET revoked_at = NOW(3) WHERE email = ? AND revoked_at IS NULL`, [email]);
  });
}

export function getRequestCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) return decodeURIComponent(rawValue.join("="));
  }
  return null;
}

/**
 * COOKIE_SECURE=auto (default): ikuti X-Forwarded-Proto / skema URL request.
 * COOKIE_SECURE=true|false: paksa.
 */
export function cookieSecure(request?: Request) {
  const mode = (process.env.COOKIE_SECURE || "auto").trim().toLowerCase();
  if (mode === "true" || mode === "1") return true;
  if (mode === "false" || mode === "0") return false;
  if (!request) return true;
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwarded) return forwarded === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return true;
  }
}

function cookieAttributes(request?: Request) {
  return `Path=/; HttpOnly; SameSite=Lax${cookieSecure(request) ? "; Secure" : ""}`;
}

export function sessionCookieHeader(token: string, expiresAt: Date, request?: Request) {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  return `${VPS_SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieAttributes(request)}; Max-Age=${maxAge}`;
}

export function clearSessionCookieHeader(request?: Request) {
  return `${VPS_SESSION_COOKIE}=; ${cookieAttributes(request)}; Max-Age=0`;
}

/**
 * Origin untuk redirect login/logout/ganti password.
 * Mengikuti domain yang sedang dibuka pengguna (mis. app.tdapekanbaru.id) selama domain itu sama
 * dengan APP_URL atau subdomain-nya, sehingga cookie sesi (host-only) tetap terbawa setelah redirect.
 * Di luar itu, kembali ke APP_URL (Coolify) atau APP_ORIGIN (kompatibilitas staging lama).
 */
export function getAppOrigin(request?: Request) {
  const value = (process.env.APP_URL || process.env.APP_ORIGIN)?.trim();
  const configured = value ? new URL(value) : null;
  if (request) {
    try {
      const current = new URL(requestOrigin(request));
      if (!configured) return current.origin;
      const base = configured.hostname.replace(/^www\./, "");
      const host = current.hostname;
      if (host === base || host === `www.${base}` || host.endsWith(`.${base}`)) return current.origin;
    } catch {
      // abaikan; pakai APP_URL
    }
  }
  if (configured) return configured.origin;
  throw new Error("APP_URL belum dikonfigurasi.");
}

/** Origin sebenarnya dari sisi klien (memperhatikan header X-Forwarded-* dari Nginx/Traefik). */
export function requestOrigin(request: Request) {
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || new URL(request.url).protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host") || new URL(request.url).host;
  return `${proto}://${host}`;
}

/**
 * Perlindungan CSRF form login/ganti password: header Origin harus sama dengan salah satu
 * origin yang sah untuk server ini — X-Forwarded-Host (dari Nginx/Traefik), header Host mentah,
 * atau APP_URL yang dikonfigurasi.
 */
export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const candidate = new URL(origin).origin;
    const accepted = new Set<string>([requestOrigin(request)]);
    const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || new URL(request.url).protocol.replace(":", "");
    const rawHost = request.headers.get("host");
    if (rawHost) {
      accepted.add(`${proto}://${rawHost}`);
      accepted.add(`https://${rawHost}`);
    }
    const configured = (process.env.APP_URL || process.env.APP_ORIGIN)?.trim();
    if (configured) accepted.add(new URL(configured).origin);
    return accepted.has(candidate);
  } catch {
    return false;
  }
}

export function safeReturnPath(value: string | null | undefined, fallback = "/admin") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return fallback;
    if (
      url.pathname === "/login" ||
      url.pathname === "/account/password" ||
      url.pathname.startsWith("/api/auth/") ||
      url.pathname === "/signin-with-chatgpt" ||
      url.pathname === "/signout-with-chatgpt" ||
      url.pathname === "/callback"
    ) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
