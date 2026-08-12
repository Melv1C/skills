import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "varlock/env";

import type { PresignedUrlOptions, Storage, StorageObject, StoragePutOptions } from "./types";

export class S3Storage implements Storage {
  private readonly client: S3Client;
  private readonly signingClient: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = ENV.S3_BUCKET;

    const credentials = {
      accessKeyId: ENV.S3_ACCESS_KEY_ID,
      secretAccessKey: ENV.S3_SECRET_ACCESS_KEY,
    };

    this.client = new S3Client({
      region: ENV.S3_REGION,
      endpoint: ENV.S3_ENDPOINT,
      forcePathStyle: ENV.S3_FORCE_PATH_STYLE ?? true,
      credentials,
    });

    // Presigned URLs must be reachable by browsers/clients.
    // In Docker, S3_ENDPOINT is often http://minio:9000 while the host uses localhost.
    this.signingClient = new S3Client({
      region: ENV.S3_REGION,
      endpoint: ENV.S3_PUBLIC_ENDPOINT || ENV.S3_ENDPOINT,
      forcePathStyle: ENV.S3_FORCE_PATH_STYLE ?? true,
      credentials,
    });
  }

  async put(
    key: string,
    body: Buffer | Uint8Array | ReadableStream | Blob,
    options: StoragePutOptions,
  ): Promise<void> {
    const payload =
      body instanceof Blob
        ? Buffer.from(await body.arrayBuffer())
        : body instanceof ReadableStream
          ? Buffer.from(await new Response(body).arrayBuffer())
          : body;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: payload,
        ContentType: options.contentType,
        ContentLength: options.contentLength ?? payload.byteLength,
      }),
    );
  }

  async get(key: string): Promise<StorageObject> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    if (!result.Body) {
      throw new Error(`Object not found: ${key}`);
    }

    return {
      body: result.Body as StorageObject["body"],
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async createPresignedUrl(key: string, options: PresignedUrlOptions = {}): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentType: options.responseContentType,
      ResponseContentDisposition: options.responseContentDisposition,
    });

    return getSignedUrl(this.signingClient, command, {
      expiresIn: options.expiresInSeconds ?? 60 * 15,
    });
  }
}
