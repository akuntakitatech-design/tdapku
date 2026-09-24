/**
 * Driver storage R2-compatible di atas S3 SDK (Cloudflare R2 / S3 lain).
 * Env: R2_ACCOUNT_ID atau R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PREFIX (opsional).
 */
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { applyHttpMetadata, bodyToBuffer, type BucketLike, type HttpMetadata, type ObjectHead, type PutOptions, type StoredObject } from "./types";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} belum dikonfigurasi untuk STORAGE_DRIVER=s3.`);
  return value;
}

function isNotFound(error: unknown) {
  const detail = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return detail?.name === "NoSuchKey" || detail?.name === "NotFound" || detail?.Code === "NoSuchKey" || detail?.$metadata?.httpStatusCode === 404;
}

export class S3Bucket implements BucketLike {
  private client: S3Client | null = null;
  private bucketName = "";
  private prefix = "";

  private setup() {
    if (this.client) return this.client;
    const endpoint = process.env.R2_ENDPOINT?.trim() || `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`;
    this.bucketName = required("R2_BUCKET");
    this.prefix = (process.env.R2_PREFIX || "").replace(/^\/+|\/+$/g, "");
    this.client = new S3Client({
      region: process.env.R2_REGION || "auto",
      endpoint,
      forcePathStyle: process.env.R2_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: required("R2_ACCESS_KEY_ID"),
        secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
      },
      // R2 belum mendukung checksum CRC32 default SDK baru untuk semua operasi.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    return this.client;
  }

  describe() {
    this.setup();
    return `s3 bucket=${this.bucketName}${this.prefix ? ` prefix=${this.prefix}` : ""}`;
  }

  private objectKey(key: string) {
    const clean = key.replace(/^\/+/, "");
    if (!clean || clean.includes("..")) throw new Error("Object key tidak valid.");
    return this.prefix ? `${this.prefix}/${clean}` : clean;
  }

  async put(key: string, value: BodyInit | null, options?: PutOptions) {
    const client = this.setup();
    const body = await bodyToBuffer(value);
    const meta = options?.httpMetadata;
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: this.objectKey(key),
        Body: body,
        ContentLength: body.byteLength,
        ContentType: meta?.contentType || "application/octet-stream",
        CacheControl: meta?.cacheControl,
        ContentDisposition: meta?.contentDisposition,
        ContentEncoding: meta?.contentEncoding,
        ContentLanguage: meta?.contentLanguage,
        Expires: meta?.cacheExpiry,
        Metadata: options?.customMetadata,
      }),
    );
    return { key, size: body.byteLength, uploaded: new Date(), etag: "", httpEtag: "", version: "s3" };
  }

  private toMetadata(response: { ContentType?: string; CacheControl?: string; ContentDisposition?: string; ContentEncoding?: string; ContentLanguage?: string; Expires?: Date }): HttpMetadata {
    return {
      contentType: response.ContentType,
      cacheControl: response.CacheControl,
      contentDisposition: response.ContentDisposition,
      contentEncoding: response.ContentEncoding,
      contentLanguage: response.ContentLanguage,
      cacheExpiry: response.Expires,
    };
  }

  async get(key: string): Promise<StoredObject | null> {
    const client = this.setup();
    try {
      const response = await client.send(new GetObjectCommand({ Bucket: this.bucketName, Key: this.objectKey(key) }));
      if (!response.Body) return null;
      const httpMetadata = this.toMetadata(response);
      const body = response.Body as { transformToWebStream(): ReadableStream<Uint8Array>; transformToByteArray(): Promise<Uint8Array>; transformToString(): Promise<string> };
      return {
        key,
        size: Number(response.ContentLength ?? 0),
        body: body.transformToWebStream(),
        httpMetadata,
        customMetadata: response.Metadata,
        writeHttpMetadata: (headers: Headers) => applyHttpMetadata(headers, httpMetadata),
        arrayBuffer: async () => {
          const bytes = await body.transformToByteArray();
          return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        },
        text: () => body.transformToString(),
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async head(key: string): Promise<ObjectHead | null> {
    const client = this.setup();
    try {
      const response = await client.send(new HeadObjectCommand({ Bucket: this.bucketName, Key: this.objectKey(key) }));
      const httpMetadata = this.toMetadata(response);
      return {
        key,
        size: Number(response.ContentLength ?? 0),
        httpMetadata,
        customMetadata: response.Metadata,
        writeHttpMetadata: (headers: Headers) => applyHttpMetadata(headers, httpMetadata),
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async delete(keyOrKeys: string | string[]) {
    const client = this.setup();
    const keys = (Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys]).filter(Boolean);
    if (!keys.length) return;
    if (keys.length === 1) {
      await client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: this.objectKey(keys[0]) }));
      return;
    }
    for (let i = 0; i < keys.length; i += 1000) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucketName,
          Delete: { Objects: keys.slice(i, i + 1000).map((key) => ({ Key: this.objectKey(key) })), Quiet: true },
        }),
      );
    }
  }
}
