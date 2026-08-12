export type StoragePutOptions = {
  contentType: string;
  contentLength?: number;
};

export type StorageObject = {
  body: ReadableStream | NodeJS.ReadableStream | AsyncIterable<Uint8Array>;
  contentType?: string;
  contentLength?: number;
};

export type PresignedUrlOptions = {
  expiresInSeconds?: number;
  responseContentType?: string;
  responseContentDisposition?: string;
};

export interface Storage {
  put(
    key: string,
    body: Buffer | Uint8Array | ReadableStream | Blob,
    options: StoragePutOptions,
  ): Promise<void>;
  get(key: string): Promise<StorageObject>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  createPresignedUrl(key: string, options?: PresignedUrlOptions): Promise<string>;
}
