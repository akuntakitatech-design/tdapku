export type HttpMetadata = {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
};

export type PutOptions = {
  httpMetadata?: HttpMetadata;
  customMetadata?: Record<string, string>;
};

export type StoredObject = {
  key: string;
  size: number;
  body: ReadableStream<Uint8Array>;
  httpMetadata: HttpMetadata;
  customMetadata?: Record<string, string>;
  writeHttpMetadata(headers: Headers): void;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
};

export type ObjectHead = Omit<StoredObject, "body" | "arrayBuffer" | "text">;

export interface BucketLike {
  put(key: string, value: BodyInit | null, options?: PutOptions): Promise<{ key: string; size: number; uploaded: Date; etag: string; httpEtag: string; version: string }>;
  get(key: string): Promise<StoredObject | null>;
  head(key: string): Promise<ObjectHead | null>;
  delete(keyOrKeys: string | string[]): Promise<void>;
}

export function applyHttpMetadata(headers: Headers, metadata: HttpMetadata = {}) {
  if (metadata.contentType) headers.set("content-type", metadata.contentType);
  if (metadata.contentLanguage) headers.set("content-language", metadata.contentLanguage);
  if (metadata.contentDisposition) headers.set("content-disposition", metadata.contentDisposition);
  if (metadata.contentEncoding) headers.set("content-encoding", metadata.contentEncoding);
  if (metadata.cacheControl) headers.set("cache-control", metadata.cacheControl);
  if (metadata.cacheExpiry) headers.set("expires", metadata.cacheExpiry.toUTCString());
}

export async function bodyToBuffer(value: BodyInit | null) {
  if (value === null) return Buffer.alloc(0);
  if (Buffer.isBuffer(value)) return value;
  return Buffer.from(await new Response(value).arrayBuffer());
}
