import { randomUUID } from "node:crypto";
import type Tag from "../../../../shared/database/tag/tag.entity";
import {
  createObject,
  deleteObject,
  objectPathFromUrl,
} from "../../../../shared/object-storage/object_storage";
import {
  invalidField,
  preconditionFailed,
  type TagError,
  tagNameTaken,
  tagNotFound,
  userNotFound,
} from "../errors/tag.errors";
import type TagRepository from "../repository/tag.repository";
import {
  validateFilterable,
  validateImage,
  validateListQuery,
  validateRemoveImage,
  validateTagId,
  validateTagName,
} from "../validators/tag.validators";

type Validation<T> = { value: T } | { error: TagError };
type UploadedImage = { buffer: Buffer };
type TagImageStorage = {
  createObject(
    remotePath: string,
    data: Buffer,
    contentType?: string,
    contentDisposition?: string,
  ): Promise<string>;
  deleteObject(remotePath: string): Promise<void>;
};
type ListResult = {
  items: Tag[];
  total: number;
  filterable: boolean | null;
  limit: number;
  page: number;
};

const defaultStorage: TagImageStorage = { createObject, deleteObject };

function unwrap<T>(result: Validation<T>): T {
  if ("error" in result) {
    throw result.error;
  }
  return result.value;
}

function isUniqueViolation(error: unknown): boolean {
  const candidate = error as { code?: string; driverError?: { code?: string } };
  return candidate.code === "23505" || candidate.driverError?.code === "23505";
}

export default class TagService {
  constructor(
    private readonly repository: TagRepository,
    private readonly storage: TagImageStorage = defaultStorage,
  ) {}

  private async findOwnedTag(userId: string, id: string): Promise<Tag> {
    unwrap(validateTagId(id));
    const tag = await this.repository.findById(id);
    if (tag == null || tag.userId !== userId) {
      throw tagNotFound();
    }
    return tag;
  }

  private async uploadImage(userId: string, image: Buffer): Promise<string> {
    return this.storage.createObject(
      `tags/${userId}/${randomUUID()}`,
      image,
      "image/svg+xml",
      "attachment",
    );
  }

  private async removeStoredImage(imageUrl: string | null): Promise<void> {
    if (imageUrl != null) {
      await this.storage.deleteObject(objectPathFromUrl(imageUrl));
    }
  }

  async create(userId: string, body: unknown, file?: UploadedImage): Promise<Tag> {
    const name = unwrap(validateTagName(body));
    const filterable = unwrap(validateFilterable(body));
    const image = unwrap(validateImage(file?.buffer));
    if ((await this.repository.findByUserAndName(userId, name)) != null) {
      throw tagNameTaken();
    }
    const id = randomUUID();
    let imageUrl: string | null = null;
    if (image != null) {
      imageUrl = await this.uploadImage(userId, image);
    }
    try {
      return await this.repository.create({ id, name, filterable, imageUrl, userId });
    } catch (error) {
      if (isUniqueViolation(error)) {
        await this.removeStoredImage(imageUrl);
        throw tagNameTaken();
      }
      throw error;
    }
  }

  async update(
    userId: string,
    id: string,
    ifMatch: string | null,
    body: unknown,
    file?: UploadedImage,
  ): Promise<Tag> {
    const existing = await this.findOwnedTag(userId, id);
    if (ifMatch != null && ifMatch !== existing.updatedAt.toISOString()) {
      throw preconditionFailed();
    }
    const name = unwrap(validateTagName(body));
    const filterable = unwrap(validateFilterable(body, true));
    const removeImage = unwrap(validateRemoveImage(body));
    if (removeImage && file != null) {
      throw invalidField("remove_image");
    }
    const image = unwrap(validateImage(file?.buffer));
    if ((await this.repository.findByUserAndName(userId, name, id)) != null) {
      throw tagNameTaken();
    }
    let imageUrl = existing.imageUrl;
    if (image != null) {
      imageUrl = await this.uploadImage(userId, image);
    }
    if (image != null || removeImage) {
      await this.removeStoredImage(existing.imageUrl);
    }
    if (removeImage) {
      imageUrl = null;
    }
    await this.repository.saveFields(id, { name, filterable, imageUrl });
    return Object.assign(existing, { name, filterable, imageUrl });
  }

  async remove(userId: string, id: string): Promise<void> {
    const tag = await this.findOwnedTag(userId, id);
    await this.repository.hardDelete(id);
    await this.removeStoredImage(tag.imageUrl);
  }

  async list(userId: string, query: unknown): Promise<ListResult> {
    unwrap(validateTagId(userId, "user"));
    const user = await this.repository.findUser(userId);
    if (user == null || user.deletedAt != null) {
      throw userNotFound();
    }
    const parsed = unwrap(validateListQuery(query));
    const { items, total } = await this.repository.findPage(userId, parsed);
    return { items, total, ...parsed };
  }

  async get(userId: string, id: string): Promise<Tag> {
    unwrap(validateTagId(userId, "user"));
    const user = await this.repository.findUser(userId);
    if (user == null || user.deletedAt != null) {
      throw userNotFound();
    }
    const tag = await this.repository.findOneForUser(userId, id);
    if (tag == null) {
      throw tagNotFound();
    }
    return tag;
  }
}
