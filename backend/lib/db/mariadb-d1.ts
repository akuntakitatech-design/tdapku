/**
 * Adapter D1-compatible (prepare/bind/first/all/raw/run/batch/exec) di atas
 * MariaDB via mysql2. Menggantikan `env.DB` Cloudflare D1 / shim PostgreSQL VPS.
 */
import mysql from "mysql2/promise";
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { bindPlaceholders, translateSqliteToMariaDb } from "./sql-translate";
import { ensureSchema } from "./ensure-schema";

type BoundValue = unknown;

export type D1Meta = { changes: number; last_row_id: number; duration?: number };
export type D1Result<T = Record<string, unknown>> = { success: true; results: T[]; meta: D1Meta };

type Queryable = Pool | PoolConnection;
type QueryOutcome = { rows: Record<string, unknown>[]; header: ResultSetHeader | null; fields: string[] };

// Disimpan di globalThis agar satu proses hanya punya satu pool & satu verifikasi skema,
// meskipun modul ini terbundel terpisah (instrumentation vs route handler).
const globalState = globalThis as unknown as { __tdapkuPool?: Pool | null; __tdapkuSchemaReady?: Promise<void> | null };

export function databaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL belum dikonfigurasi (format mysql://user:pass@host:3306/db).");
  }
  return url;
}

export function getPool(): Pool {
  if (globalState.__tdapkuPool) return globalState.__tdapkuPool;
  const url = new URL(databaseUrl());
  const pool = mysql.createPool({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, "") || "default",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_MAX || 10),
    queueLimit: 0,
    charset: "utf8mb4",
    timezone: "Z",
    decimalNumbers: true,
    // DATE() SQLite mengembalikan teks "YYYY-MM-DD"; samakan (DATETIME tetap objek Date).
    dateStrings: ["DATE"],
    supportBigNumbers: true,
    bigNumberStrings: false,
    multipleStatements: false,
    connectTimeout: 10_000,
    // Sesi selalu UTC (sama dengan CURRENT_TIMESTAMP SQLite) dan `||` = concat (SQLite).
    connectAttributes: { program_name: "tdapku" },
  });
  pool.on("connection", (connection) => {
    connection.query("SET time_zone = '+00:00', sql_mode = CONCAT(@@sql_mode, ',PIPES_AS_CONCAT')");
  });
  globalState.__tdapkuPool = pool;
  return pool;
}

/** Skema diterapkan sekali per proses sebelum query pertama (idempoten). */
export function schemaReady() {
  if (!globalState.__tdapkuSchemaReady) {
    globalState.__tdapkuSchemaReady = ensureSchema(getPool()).catch((error) => {
      globalState.__tdapkuSchemaReady = null;
      throw error;
    });
  }
  return globalState.__tdapkuSchemaReady;
}

function mapError(error: unknown, sourceSql: string): Error {
  const detail = error as { code?: string; errno?: number; message?: string; sqlMessage?: string };
  const message = detail.sqlMessage || detail.message || String(error);
  let mapped: Error;
  if (detail.code === "ER_DUP_ENTRY" || detail.errno === 1062) {
    mapped = new Error(`UNIQUE constraint failed: ${message}`);
  } else if (detail.code === "ER_NO_REFERENCED_ROW_2" || detail.code === "ER_ROW_IS_REFERENCED_2" || detail.errno === 1452 || detail.errno === 1451) {
    mapped = new Error(`FOREIGN KEY constraint failed: ${message}`);
  } else {
    mapped = new Error(message);
  }
  Object.assign(mapped, { code: detail.code, errno: detail.errno, sourceSql: sourceSql.replace(/\s+/g, " ").slice(0, 400) });
  return mapped;
}

function normalizeValue(value: unknown) {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (value instanceof Uint8Array && !(value instanceof Buffer)) return Buffer.from(value);
  return value;
}

async function runQuery(queryable: Queryable, sql: string, values: BoundValue[], sourceSql: string): Promise<QueryOutcome> {
  const finalSql = bindPlaceholders(sql, values.map(normalizeValue), (value) => mysql.escape(value as Parameters<typeof mysql.escape>[0]));
  try {
    const [result, fieldPackets] = await queryable.query(finalSql);
    if (Array.isArray(result)) {
      const fields = Array.isArray(fieldPackets) ? fieldPackets.map((field) => field.name) : [];
      return { rows: result as RowDataPacket[] as Record<string, unknown>[], header: null, fields };
    }
    return { rows: [], header: result as ResultSetHeader, fields: [] };
  } catch (error) {
    const mapped = mapError(error, sourceSql);
    console.error("MariaDB query gagal", { message: mapped.message, sourceSql: sourceSql.replace(/\s+/g, " ").slice(0, 400) });
    throw mapped;
  }
}


/** Hitung placeholder `?` di luar kutip. */
function countPlaceholders(sql: string) {
  let count = 0;
  let quote: string | null = null;
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    if (quote) {
      if (char === quote) quote = sql[i + 1] === quote ? (i += 1, quote) : null;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") quote = char;
    else if (char === "?") count += 1;
  }
  return count;
}

const UPDATE_RETURNING = /^\s*UPDATE\s+(`?[A-Za-z_][A-Za-z0-9_]*`?)\s+SET\s+([\s\S]*?)\s+WHERE\s+([\s\S]*?)\s+RETURNING\s+([\s\S]+?)\s*;?\s*$/i;

/**
 * MariaDB hanya mendukung RETURNING pada INSERT/DELETE/REPLACE. `UPDATE ... RETURNING`
 * (SQLite) diemulasi dalam transaksi: kunci & ambil id baris yang cocok, UPDATE berdasarkan id,
 * lalu SELECT kolom RETURNING. Tabel harus punya kolom `id`.
 */
async function runUpdateReturning(match: RegExpMatchArray, values: BoundValue[], sourceSql: string): Promise<QueryOutcome> {
  const [, table, setClause, whereClause, returning] = match;
  const setCount = countPlaceholders(setClause);
  const setValues = values.slice(0, setCount);
  const whereValues = values.slice(setCount);
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const selected = await runQuery(connection, `SELECT id FROM ${table} WHERE ${whereClause} FOR UPDATE`, whereValues, sourceSql);
    const ids = selected.rows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id));
    let outcome: QueryOutcome = { rows: [], header: { affectedRows: 0, insertId: 0 } as ResultSetHeader, fields: [] };
    if (ids.length) {
      const placeholders = ids.map(() => "?").join(", ");
      const updated = await runQuery(connection, `UPDATE ${table} SET ${setClause} WHERE id IN (${placeholders})`, [...setValues, ...ids], sourceSql);
      const rows = await runQuery(connection, `SELECT ${returning} FROM ${table} WHERE id IN (${placeholders})`, ids, sourceSql);
      outcome = { rows: rows.rows, header: updated.header, fields: rows.fields };
    }
    await connection.commit();
    return outcome;
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}

function toMeta(outcome: QueryOutcome): D1Meta {
  return {
    changes: outcome.header?.affectedRows ?? 0,
    last_row_id: Number(outcome.header?.insertId ?? outcome.rows[0]?.id ?? 0),
  };
}

export class MariaPreparedStatement {
  private values: BoundValue[] = [];
  readonly translatedSql: string;

  constructor(private readonly database: MariaD1Database, readonly sourceSql: string) {
    this.translatedSql = translateSqliteToMariaDb(sourceSql);
  }

  bind(...values: BoundValue[]) {
    const statement = new MariaPreparedStatement(this.database, this.sourceSql);
    statement.values = values;
    return statement;
  }

  async execute(queryable?: Queryable) {
    await schemaReady();
    const updateReturning = this.translatedSql.match(UPDATE_RETURNING);
    if (updateReturning && !queryable) return runUpdateReturning(updateReturning, this.values, this.sourceSql);
    if (updateReturning && queryable) {
      // Di dalam batch (koneksi transaksi sudah ada): jalankan tanpa RETURNING, lalu SELECT.
      const [, table, setClause, whereClause, returning] = updateReturning;
      const setCount = countPlaceholders(setClause);
      const selected = await runQuery(queryable, `SELECT id FROM ${table} WHERE ${whereClause} FOR UPDATE`, this.values.slice(setCount), this.sourceSql);
      const ids = selected.rows.map((row) => Number(row.id));
      if (!ids.length) return { rows: [], header: { affectedRows: 0, insertId: 0 } as ResultSetHeader, fields: [] };
      const placeholders = ids.map(() => "?").join(", ");
      const updated = await runQuery(queryable, `UPDATE ${table} SET ${setClause} WHERE id IN (${placeholders})`, [...this.values.slice(0, setCount), ...ids], this.sourceSql);
      const rows = await runQuery(queryable, `SELECT ${returning} FROM ${table} WHERE id IN (${placeholders})`, ids, this.sourceSql);
      return { rows: rows.rows, header: updated.header, fields: rows.fields };
    }
    return runQuery(queryable ?? getPool(), this.translatedSql, this.values, this.sourceSql);
  }

  async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
    const outcome = await this.execute();
    return { success: true, results: outcome.rows as T[], meta: toMeta(outcome) };
  }

  async first<T = Record<string, unknown>>(columnName?: string): Promise<T | null> {
    const outcome = await this.execute();
    const row = outcome.rows[0] as T | undefined;
    if (!row) return null;
    if (columnName) return (row as Record<string, unknown>)[columnName] as T;
    return row;
  }

  async raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[]> {
    const outcome = await this.execute();
    const fields = outcome.fields.length ? outcome.fields : Object.keys(outcome.rows[0] ?? {});
    const rows = outcome.rows.map((row) => fields.map((field) => row[field])) as T[];
    return options?.columnNames ? [fields as unknown as T, ...rows] : rows;
  }

  async run(): Promise<D1Result> {
    const outcome = await this.execute();
    return { success: true, results: outcome.rows, meta: toMeta(outcome) };
  }
}

export class MariaD1Database {
  prepare(sql: string) {
    return new MariaPreparedStatement(this, sql);
  }

  /** Semua statement dijalankan berurutan dalam satu transaksi (seperti D1 batch). */
  async batch(statements: MariaPreparedStatement[]): Promise<D1Result[]> {
    await schemaReady();
    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();
      const results: D1Result[] = [];
      for (const statement of statements) {
        const outcome = await statement.execute(connection);
        results.push({ success: true, results: outcome.rows, meta: toMeta(outcome) });
      }
      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback().catch(() => undefined);
      throw error;
    } finally {
      connection.release();
    }
  }

  async exec(sql: string) {
    await schemaReady();
    const statements = sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
    let count = 0;
    for (const statement of statements) {
      const outcome = await runQuery(getPool(), translateSqliteToMariaDb(statement), [], statement);
      count += outcome.header?.affectedRows ?? outcome.rows.length;
    }
    return { count, duration: 0 };
  }

  /** Query langsung (tanpa translasi) untuk modul internal seperti auth. */
  async query<T = Record<string, unknown>>(sql: string, values: BoundValue[] = []): Promise<{ rows: T[]; header: ResultSetHeader | null }> {
    await schemaReady();
    const outcome = await runQuery(getPool(), sql, values, sql);
    return { rows: outcome.rows as T[], header: outcome.header };
  }

  async transaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
    await schemaReady();
    const connection = await getPool().getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback().catch(() => undefined);
      throw error;
    } finally {
      connection.release();
    }
  }
}

export const mariaDb = new MariaD1Database();
