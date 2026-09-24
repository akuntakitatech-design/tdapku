/**
 * Pengganti binding `cloudflare:workers` (env.DB / env.BUCKET) untuk runtime Node.js di Coolify.
 * - env.DB     : D1-compatible di atas MariaDB (lib/db/mariadb-d1.ts)
 * - env.BUCKET : R2-compatible di atas S3 SDK (Cloudflare R2) atau disk lokal (lib/storage)
 */
import { mariaDb } from "@/lib/db/mariadb-d1";
import { getBucket, type BucketLike } from "@/lib/storage";

const bucketProxy: BucketLike = {
  put: (key, value, options) => getBucket().put(key, value, options),
  get: (key) => getBucket().get(key),
  head: (key) => getBucket().head(key),
  delete: (keys) => getBucket().delete(keys),
};

export const env = {
  DB: mariaDb,
  BUCKET: bucketProxy,
};

export type RuntimeEnv = typeof env;
