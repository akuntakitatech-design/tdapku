/**
 * Menerapkan skema MariaDB secara idempoten saat aplikasi start
 * (CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS / ADD CONSTRAINT IF NOT EXISTS),
 * lalu bootstrap akun admin bila tabel akun masih kosong.
 */
import { createHash } from "node:crypto";
import type { Pool } from "mysql2/promise";
import { SCHEMA_SQL } from "./schema.generated";

const LOCK_NAME = "tdapku_schema_lock";
const SCHEMA_VERSION_TABLE = "schema_migrations";

function statements(sql: string) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.replace(/^\s*--.*$/gm, "").trim())
    .filter((statement) => statement && !/^SET\s+(NAMES|time_zone)/i.test(statement));
}

export async function ensureSchema(pool: Pool) {
  if (process.env.SKIP_SCHEMA_SYNC === "true") return;
  const connection = await pool.getConnection();
  try {
    const [lock] = await connection.query(`SELECT GET_LOCK(?, 120) AS acquired`, [LOCK_NAME]);
    if (Number((lock as Array<{ acquired: number }>)[0]?.acquired) !== 1) {
      throw new Error("Tidak dapat memperoleh lock skema database.");
    }
    const started = Date.now();
    const checksum = createHash("sha256").update(SCHEMA_SQL).digest("hex");
    await connection.query(
      `CREATE TABLE IF NOT EXISTS \`${SCHEMA_VERSION_TABLE}\` (
        checksum CHAR(64) NOT NULL PRIMARY KEY,
        statements INT NOT NULL,
        applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );
    const [known] = await connection.query(`SELECT checksum FROM \`${SCHEMA_VERSION_TABLE}\` WHERE checksum = ? LIMIT 1`, [checksum]);
    if ((known as unknown[]).length) {
      console.log(`[schema] skema ${checksum.slice(0, 12)} sudah diterapkan sebelumnya (${Date.now() - started} ms)`);
    } else {
      let applied = 0;
      for (const statement of statements(SCHEMA_SQL)) {
        await connection.query(statement);
        applied += 1;
      }
      await connection.query(`INSERT IGNORE INTO \`${SCHEMA_VERSION_TABLE}\` (checksum, statements) VALUES (?, ?)`, [checksum, applied]);
      console.log(`[schema] ${applied} pernyataan skema diterapkan/diverifikasi (${Date.now() - started} ms)`);
    }
    await bootstrapAdmin(connection);
  } finally {
    await connection.query(`SELECT RELEASE_LOCK(?)`, [LOCK_NAME]).catch(() => undefined);
    connection.release();
  }
}

/**
 * Bootstrap admin awal — hanya bila tabel akun login kosong dan
 * BOOTSTRAP_ADMIN_EMAIL + BOOTSTRAP_ADMIN_PASSWORD diisi. Akun yang sudah ada tidak diubah.
 */
async function bootstrapAdmin(connection: import("mysql2/promise").PoolConnection) {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) return;
  const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM vps_auth_accounts`);
  const total = Number((rows as Array<{ total: number }>)[0]?.total ?? 0);
  if (total > 0) {
    console.log("[bootstrap] akun login sudah ada; BOOTSTRAP_ADMIN_* diabaikan (password lama dipertahankan)");
    return;
  }
  const { hashVpsPassword } = await import("@/lib/vps-auth");
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || email;
  const hash = await hashVpsPassword(password);
  await connection.query(
    `INSERT INTO vps_auth_accounts (email, display_name, password_hash, is_active, must_change_password) VALUES (?, ?, ?, 1, 0)`,
    [email, name, hash],
  );
  await connection.query(
    `INSERT INTO users (name, email, role, division_id, is_active, updated_at) VALUES (?, ?, 'ketua_ksb', NULL, 1, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE role = 'ketua_ksb', is_active = 1, updated_at = CURRENT_TIMESTAMP`,
    [name, email],
  );
  console.log(`[bootstrap] akun admin ${email} dibuat dari BOOTSTRAP_ADMIN_*`);
}
