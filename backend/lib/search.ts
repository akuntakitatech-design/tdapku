/**
 * Helper pencarian server-side (tanpa index/skema baru): keyword di-trim, dibatasi panjangnya,
 * lalu dijadikan pola LIKE "%...%" dengan wildcard pengguna (% _ \) di-escape.
 */
export function normalizeSearchParam(value: string | null | undefined, max = 80) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

export function likeContains(keyword: string) {
  return `%${keyword.toLocaleLowerCase("id-ID").replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
