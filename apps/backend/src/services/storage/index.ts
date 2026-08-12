import { S3Storage } from "./s3";
import type { Storage } from "./types";

let storage: Storage | undefined;

export function getStorage(): Storage {
  if (!storage) {
    storage = new S3Storage();
  }
  return storage;
}

export type { Storage } from "./types";
