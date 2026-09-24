import { LocalBucket } from "./local-bucket";
import { S3Bucket } from "./s3-bucket";
import type { BucketLike } from "./types";

export type { BucketLike, StoredObject } from "./types";

let bucket: (BucketLike & { describe(): string }) | null = null;

export function storageDriver() {
  const driver = (process.env.STORAGE_DRIVER || "s3").trim().toLowerCase();
  return driver === "r2" ? "s3" : driver;
}

export function getBucket() {
  if (bucket) return bucket;
  const driver = storageDriver();
  if (driver === "s3") bucket = new S3Bucket();
  else if (driver === "local") bucket = new LocalBucket();
  else throw new Error(`STORAGE_DRIVER tidak dikenal: ${driver} (pakai s3 atau local).`);
  return bucket;
}
