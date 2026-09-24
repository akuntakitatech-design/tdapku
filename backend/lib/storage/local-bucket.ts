/**
 * Driver storage lokal (disk) — untuk pengembangan / fallback tanpa R2.
 * Format identik dengan VPS staging: file + .tda-metadata/<key>.json.
 */
import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { applyHttpMetadata, bodyToBuffer, type BucketLike, type HttpMetadata, type ObjectHead, type PutOptions, type StoredObject } from "./types";

type StoredMetadata = {
  httpMetadata?: Omit<HttpMetadata, "cacheExpiry"> & { cacheExpiry?: string };
  customMetadata?: Record<string, string>;
};

export class LocalBucket implements BucketLike {
  private readonly root: string;
  private readonly metadataRoot: string;

  constructor(root = process.env.UPLOAD_PATH || "./data/uploads") {
    this.root = resolve(root);
    this.metadataRoot = resolve(this.root, ".tda-metadata");
  }

  describe() {
    return `local dir=${this.root}`;
  }

  private safePath(base: string, key: string) {
    const path = resolve(base, key.replace(/^\/+/, ""));
    if (path !== base && !path.startsWith(`${base}${sep}`)) throw new Error("Object key tidak valid.");
    return path;
  }

  private objectPath(key: string) {
    return this.safePath(this.root, key);
  }

  private metadataPath(key: string) {
    return `${this.safePath(this.metadataRoot, key)}.json`;
  }

  private async loadMetadata(key: string): Promise<StoredMetadata> {
    try {
      return JSON.parse(await readFile(this.metadataPath(key), "utf8")) as StoredMetadata;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw error;
    }
  }

  async put(key: string, value: BodyInit | null, options?: PutOptions) {
    const path = this.objectPath(key);
    await mkdir(dirname(path), { recursive: true });
    const bytes = await bodyToBuffer(value);
    const temporary = `${path}.tmp-${process.pid}-${crypto.randomUUID()}`;
    await writeFile(temporary, bytes, { mode: 0o640 });
    await rename(temporary, path);
    const metadataPath = this.metadataPath(key);
    await mkdir(dirname(metadataPath), { recursive: true });
    await writeFile(
      metadataPath,
      JSON.stringify({
        httpMetadata: options?.httpMetadata ? { ...options.httpMetadata, cacheExpiry: options.httpMetadata.cacheExpiry?.toISOString() } : undefined,
        customMetadata: options?.customMetadata,
      } satisfies StoredMetadata),
      { mode: 0o600 },
    );
    return { key, size: bytes.byteLength, uploaded: new Date(), etag: "", httpEtag: "", version: "local" };
  }

  async head(key: string): Promise<ObjectHead | null> {
    const path = this.objectPath(key);
    try {
      const info = await stat(path);
      if (!info.isFile()) return null;
      const stored = await this.loadMetadata(key);
      const httpMetadata: HttpMetadata = {
        ...stored.httpMetadata,
        cacheExpiry: stored.httpMetadata?.cacheExpiry ? new Date(stored.httpMetadata.cacheExpiry) : undefined,
      };
      return {
        key,
        size: info.size,
        httpMetadata,
        customMetadata: stored.customMetadata,
        writeHttpMetadata: (headers: Headers) => applyHttpMetadata(headers, httpMetadata),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async get(key: string): Promise<StoredObject | null> {
    const head = await this.head(key);
    if (!head) return null;
    const path = this.objectPath(key);
    return {
      ...head,
      body: Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>,
      arrayBuffer: async () => {
        const buffer = await readFile(path);
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
      },
      text: () => readFile(path, "utf8"),
    };
  }

  async delete(keyOrKeys: string | string[]) {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    await Promise.all(
      keys.flatMap((key) => [
        unlink(this.objectPath(key)).catch((error) => {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }),
        unlink(this.metadataPath(key)).catch((error) => {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }),
      ]),
    );
  }
}
