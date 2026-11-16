jest.mock("firebase-admin/app", () => ({
  initializeApp: jest.fn(() => ({ name: "portfolio" })),
  getApps: jest.fn(() => []),
  cert: jest.fn((credentials: unknown) => credentials),
}));
jest.mock("firebase-admin/storage", () => ({ getStorage: jest.fn() }));
jest.mock("../../../src/shared/security/configuration/environment", () => ({
  __esModule: true,
  default: {
    FIREBASE_SERVICE_ACCOUNT:
      '{"project_id":"portfolio-f8577","private_key":"line1\\nline2","client_email":"admin@portfolio.test"}',
    FIREBASE_STORAGE_BUCKET: "portfolio-f8577.firebasestorage.app",
  },
}));

import { cert, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import {
  createObject,
  deleteObject,
  updateObject,
} from "../../../src/shared/object-storage/object_storage";

type ObjectStorage = typeof import("../../../src/shared/object-storage/object_storage");

const serviceAccount = {
  project_id: "portfolio-f8577",
  private_key: "line1\nline2",
  client_email: "admin@portfolio.test",
};

const save = jest.fn();
const remove = jest.fn();
const file = jest.fn(() => ({ save, delete: remove }));
const bucket = jest.fn(() => ({ file }));
const data = Buffer.from("image-bytes");
const remotePath = "portfolio/cover.png";
const publicUrl = `https://storage.googleapis.com/portfolio-f8577.firebasestorage.app/${remotePath}`;

function loadIsolatedStorage(existingApps: { name: string }[] = []) {
  const isolatedFile = jest.fn(() => ({
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  }));
  const captured: {
    app?: { initializeApp: jest.Mock; getApps: jest.Mock };
    storage?: ObjectStorage;
  } = {};

  jest.isolateModules(() => {
    const appModule = require("firebase-admin/app") as {
      initializeApp: jest.Mock;
      getApps: jest.Mock;
    };
    const storageModule = require("firebase-admin/storage") as { getStorage: jest.Mock };

    appModule.getApps.mockReturnValue(existingApps);
    storageModule.getStorage.mockReturnValue({ bucket: () => ({ file: isolatedFile }) });
    captured.app = appModule;
    captured.storage = require("../../../src/shared/object-storage/object_storage");
  });

  if (!captured.app || !captured.storage) throw new Error("isolated object storage did not load");
  return { app: captured.app, storage: captured.storage, file: isolatedFile };
}

beforeEach(() => {
  jest.clearAllMocks();
  save.mockResolvedValue(undefined);
  remove.mockResolvedValue(undefined);
  (getStorage as jest.Mock).mockReturnValue({ bucket });
});

test("createObject initializes from the service account and returns the public URL", async () => {
  await expect(createObject(remotePath, data, "image/png")).resolves.toBe(publicUrl);

  expect(cert).toHaveBeenCalledWith(serviceAccount);
  expect(initializeApp).toHaveBeenCalledWith({
    credential: serviceAccount,
    storageBucket: "portfolio-f8577.firebasestorage.app",
  });
  expect(file).toHaveBeenCalledWith(remotePath);
  expect(save).toHaveBeenCalledWith(data, { contentType: "image/png" });
});

test("updateObject overwrites the same path and returns the public URL", async () => {
  const replaced = Buffer.from("new-image-bytes");

  await expect(updateObject(remotePath, replaced, "image/png")).resolves.toBe(publicUrl);

  expect(file).toHaveBeenCalledWith(remotePath);
  expect(save).toHaveBeenCalledWith(replaced, { contentType: "image/png" });
});

test("deleteObject deletes the file at the path", async () => {
  await deleteObject(remotePath);

  expect(file).toHaveBeenCalledWith(remotePath);
  expect(remove).toHaveBeenCalledTimes(1);
});

test("initialization is idempotent across calls", async () => {
  const isolated = loadIsolatedStorage();

  await isolated.storage.createObject(remotePath, data);
  await isolated.storage.createObject("portfolio/other.png", data);

  expect(isolated.app.initializeApp).toHaveBeenCalledTimes(1);
  expect(isolated.file).toHaveBeenCalledTimes(2);
});

test("reuses an already initialized firebase app", async () => {
  const isolated = loadIsolatedStorage([{ name: "existing" }]);

  await isolated.storage.deleteObject(remotePath);

  expect(isolated.app.initializeApp).not.toHaveBeenCalled();
  expect(isolated.file).toHaveBeenCalledWith(remotePath);
});
