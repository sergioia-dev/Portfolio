import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getStorage, type Storage } from "firebase-admin/storage";
import environment from "../security/configuration/environment";

let app: App | null = null;

function getBucket(): ReturnType<Storage["bucket"]> {
  if (app == null) {
    app =
      getApps()[0] ??
      initializeApp({
        credential: cert(JSON.parse(environment.FIREBASE_SERVICE_ACCOUNT as string)),
        storageBucket: environment.FIREBASE_STORAGE_BUCKET as string,
      });
  }
  return getStorage(app).bucket();
}

function publicUrl(remotePath: string): string {
  return `https://storage.googleapis.com/${environment.FIREBASE_STORAGE_BUCKET}/${remotePath}`;
}

async function createObject(
  remotePath: string,
  data: Buffer,
  contentType?: string,
): Promise<string> {
  await getBucket().file(remotePath).save(data, { contentType });
  return publicUrl(remotePath);
}

async function updateObject(
  remotePath: string,
  data: Buffer,
  contentType?: string,
): Promise<string> {
  await getBucket().file(remotePath).save(data, { contentType });
  return publicUrl(remotePath);
}

async function deleteObject(remotePath: string): Promise<void> {
  await getBucket().file(remotePath).delete();
}

export { createObject, deleteObject, updateObject };
