/**
 * Translasi SQL dialek SQLite/D1 (Versi 61) -> MariaDB 10.11+/11.
 *
 * Hanya pola yang benar-benar dipakai aplikasi yang ditangani di sini; query
 * bisnis tidak ditulis ulang. Setiap aturan diberi komentar supaya mudah
 * ditelusuri bila ada query baru yang belum tercakup.
 */

function replaceOutsideQuotes(sql: string, replacer: (segment: string) => string) {
  let output = "";
  let segment = "";
  let quote: string | null = null;
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    if (quote) {
      output += char;
      if (char === quote) {
        if (sql[i + 1] === quote) {
          output += sql[i + 1];
          i += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      output += replacer(segment) + char;
      segment = "";
      quote = char;
      continue;
    }
    segment += char;
  }
  return output + replacer(segment);
}

/** Ubah MIN(a, b)/MAX(a, b) skalar (>= 2 argumen) menjadi LEAST/GREATEST. */
function scalarMinMax(sql: string) {
  const pattern = /\b(MIN|MAX)\s*\(/gi;
  let result = "";
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sql)) !== null) {
    const start = match.index;
    const open = start + match[0].length - 1;
    let depth = 0;
    let commas = 0;
    let quote: string | null = null;
    let close = -1;
    for (let i = open; i < sql.length; i += 1) {
      const char = sql[i];
      if (quote) {
        if (char === quote) quote = null;
        continue;
      }
      if (char === "'" || char === '"' || char === "`") quote = char;
      else if (char === "(") depth += 1;
      else if (char === ")") {
        depth -= 1;
        if (depth === 0) {
          close = i;
          break;
        }
      } else if (char === "," && depth === 1) commas += 1;
    }
    if (close === -1) break;
    if (commas >= 1) {
      result += sql.slice(cursor, start) + (match[1].toUpperCase() === "MIN" ? "LEAST(" : "GREATEST(");
      cursor = open + 1;
    }
    pattern.lastIndex = open + 1;
  }
  return result + sql.slice(cursor);
}

/** `INSERT ... ON CONFLICT(kolom) DO UPDATE SET a = excluded.a` -> `ON DUPLICATE KEY UPDATE a = VALUES(a)`. */
function upsert(sql: string) {
  if (!/\bON\s+CONFLICT\b/i.test(sql)) return sql;
  let output = sql.replace(/\bON\s+CONFLICT\s*\([^)]*\)\s*DO\s+UPDATE\s+SET\b/gi, "ON DUPLICATE KEY UPDATE");
  output = output.replace(/\bON\s+CONFLICT\s*(\([^)]*\))?\s*DO\s+NOTHING\b/gi, "ON DUPLICATE KEY UPDATE id = id");
  output = output.replace(/\bexcluded\.([A-Za-z_][A-Za-z0-9_]*)/gi, "VALUES($1)");
  return output;
}


/** Kata kunci reserved MariaDB yang di SQLite boleh dipakai sebagai alias kolom tanpa kutip. */
const RESERVED_ALIASES = new Set([
  "key", "order", "group", "index", "table", "select", "values", "range", "rank", "rows", "window",
  "default", "condition", "primary", "references", "option", "check", "column", "database", "interval",
  "lock", "partition", "procedure", "read", "write", "using", "row", "over", "offset", "returning",
  "ignore", "limit", "match", "replace", "schema", "trigger", "union", "unique", "update", "usage",
]);

function quoteReservedAliases(sql: string) {
  return sql.replace(/\bAS\s+([A-Za-z_][A-Za-z0-9_]*)\b(?!\s*\()/gi, (match, alias: string) =>
    RESERVED_ALIASES.has(alias.toLowerCase()) ? `AS \`${alias}\`` : match,
  );
}

/**
 * SQLite mengizinkan derived table tanpa alias (`FROM (SELECT ...) ORDER BY ...`);
 * MariaDB mewajibkan alias. Tambahkan alias sintetis bila tidak ada.
 */
function aliasDerivedTables(sql: string) {
  const pattern = /\b(FROM|JOIN)\s*\(\s*SELECT\b/gi;
  let output = sql;
  let counter = 0;
  let match: RegExpExecArray | null;
  const terminators = /^(WHERE|GROUP|ORDER|LIMIT|HAVING|UNION|JOIN|LEFT|RIGHT|INNER|CROSS|ON|WINDOW|OFFSET|FOR)\b/i;
  while ((match = pattern.exec(output)) !== null) {
    const open = output.indexOf("(", match.index);
    let depth = 0;
    let quote: string | null = null;
    let close = -1;
    for (let i = open; i < output.length; i += 1) {
      const char = output[i];
      if (quote) {
        if (char === quote) quote = null;
        continue;
      }
      if (char === "'" || char === '"' || char === "`") quote = char;
      else if (char === "(") depth += 1;
      else if (char === ")") {
        depth -= 1;
        if (depth === 0) {
          close = i;
          break;
        }
      }
    }
    if (close === -1) break;
    const rest = output.slice(close + 1);
    const trimmed = rest.replace(/^\s+/, "");
    const needsAlias = trimmed === "" || trimmed.startsWith(")") || trimmed.startsWith(",") || trimmed.startsWith(";") || terminators.test(trimmed);
    if (needsAlias) {
      counter += 1;
      output = `${output.slice(0, close + 1)} AS _dt${counter}${rest}`;
    }
    pattern.lastIndex = close + 1;
  }
  return output;
}

export function translateSqliteToMariaDb(sql: string): string {
  let output = sql;

  // INSERT OR IGNORE / OR REPLACE
  output = output.replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/gi, "INSERT IGNORE INTO");
  output = output.replace(/\bINSERT\s+OR\s+REPLACE\s+INTO\b/gi, "REPLACE INTO");

  output = upsert(output);

  output = replaceOutsideQuotes(output, (segment) => {
    let s = segment;
    // Collation: MariaDB utf8mb4_unicode_ci sudah case-insensitive.
    s = s.replace(/\s+COLLATE\s+NOCASE\b/gi, "");
    // CAST(... AS INTEGER|REAL|TEXT)
    s = s.replace(/\bAS\s+INTEGER\s*\)/gi, "AS SIGNED)");
    s = s.replace(/\bAS\s+REAL\s*\)/gi, "AS DOUBLE)");
    s = s.replace(/\bAS\s+TEXT\s*\)/gi, "AS CHAR)");
    // Fungsi tanggal SQLite yang dipakai aplikasi.
    s = s.replace(/\bdatetime\s*\(\s*'now'\s*\)/gi, "DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')");
    s = s.replace(/\bdate\s*\(\s*'now'\s*\)/gi, "DATE_FORMAT(UTC_DATE(), '%Y-%m-%d')");
    s = s.replace(/\bIFNULL\s*\(/gi, "COALESCE(");
    s = s.replace(/\bRANDOM\s*\(\s*\)/gi, "RAND()");
    s = s.replace(/\blast_insert_rowid\s*\(\s*\)/gi, "LAST_INSERT_ID()");
    return s;
  });

  // datetime('now') di dalam kutip tunggal tidak tersentuh replaceOutsideQuotes, jadi
  // tangani pola literal khusus ini (argumen 'now' adalah string literal).
  output = output.replace(/\bdatetime\s*\(\s*'now'\s*\)/gi, "DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d %H:%i:%s')");
  output = output.replace(/\bdate\s*\(\s*'now'\s*\)/gi, "DATE_FORMAT(UTC_DATE(), '%Y-%m-%d')");

  // GROUP_CONCAT(expr, 'sep') -> GROUP_CONCAT(expr SEPARATOR 'sep')
  output = output.replace(
    /\bGROUP_CONCAT\s*\(\s*([^(),]+?)\s*,\s*('(?:''|[^'])*')\s*\)/gi,
    "GROUP_CONCAT($1 SEPARATOR $2)",
  );

  output = scalarMinMax(output);
  output = quoteReservedAliases(output);
  output = aliasDerivedTables(output);

  return output;
}

/** Ganti placeholder `?` di luar kutip dengan nilai yang sudah di-escape. */
export function bindPlaceholders(sql: string, values: unknown[], escape: (value: unknown) => string) {
  let index = 0;
  let output = "";
  let quote: string | null = null;
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    if (quote) {
      output += char;
      if (char === quote) {
        if (sql[i + 1] === quote) {
          output += sql[i + 1];
          i += 1;
        } else quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      output += char;
      continue;
    }
    if (char === "?") {
      if (index >= values.length) throw new Error(`Jumlah nilai bind kurang untuk SQL: ${sql.slice(0, 120)}`);
      output += escape(values[index]);
      index += 1;
      continue;
    }
    output += char;
  }
  if (index !== values.length) {
    throw new Error(`Jumlah nilai bind (${values.length}) tidak sama dengan placeholder (${index}).`);
  }
  return output;
}
