import { randomUUID } from "node:crypto";
import type Certification from "../../../../shared/database/certification/certification.entity";
import {
  createObject,
  deleteObject,
  objectPathFromUrl,
} from "../../../../shared/object-storage/object_storage";
import {
  type CertificationError,
  certificationNotFound,
  titleTaken,
  userNotFound,
} from "../errors/certification.errors";
import type CertificationRepository from "../repository/certification.repository";
import {
  type ListQuery,
  validateCertificationId,
  validateCreateParts,
  validateListQuery,
  validatePublicCertificationId,
  validateUpdateParts,
  validateUserId,
} from "../validators/certification.validators";

type Validation<T> = { value: T } | { error: CertificationError };
type CertificationDocumentStorage = {
  createObject(
    remotePath: string,
    data: Buffer,
    contentType?: string,
    contentDisposition?: string,
  ): Promise<string>;
  deleteObject(remotePath: string): Promise<void>;
};
type ListResult = {
  items: Certification[];
  limit: number;
  page: number;
  total: number;
};

const defaultStorage: CertificationDocumentStorage = { createObject, deleteObject };

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

export default class CertificationService {
  constructor(
    private readonly repository: CertificationRepository,
    private readonly storage: CertificationDocumentStorage = defaultStorage,
  ) {}

  private async findOwnedCertification(userId: string, id: string): Promise<Certification> {
    unwrap(validateCertificationId(id));
    const certification = await this.repository.findById(id);
    if (certification == null || certification.userId !== userId) {
      throw certificationNotFound();
    }
    return certification;
  }

  private async uploadDocument(userId: string, document: Buffer): Promise<string> {
    return this.storage.createObject(
      `${userId}/certifications/${randomUUID()}.pdf`,
      document,
      "application/pdf",
      "attachment",
    );
  }

  private async removeStoredDocument(documentUrl: string): Promise<void> {
    try {
      await this.storage.deleteObject(objectPathFromUrl(documentUrl));
    } catch (error) {
      console.error("!!! Orphaned certification document :\n", documentUrl, error);
    }
  }

  private async assertAvailableTitle(
    userId: string,
    title: string,
    excludeId?: string,
  ): Promise<void> {
    if ((await this.repository.findByUserAndTitle(userId, title, excludeId)) != null) {
      throw titleTaken();
    }
  }

  async create(userId: string, body: unknown, document?: Buffer): Promise<Certification> {
    const parts = unwrap(validateCreateParts(body, document));
    await this.assertAvailableTitle(userId, parts.title);
    const id = randomUUID();
    const documentUrl = await this.uploadDocument(userId, parts.document);
    try {
      return await this.repository.create({
        id,
        title: parts.title,
        description: parts.description,
        documentUrl,
        userId,
      });
    } catch (error) {
      await this.removeStoredDocument(documentUrl);
      if (isUniqueViolation(error)) {
        throw titleTaken();
      }
      throw error;
    }
  }

  async update(
    userId: string,
    id: string,
    body: unknown,
    document?: Buffer,
  ): Promise<Certification> {
    const existing = await this.findOwnedCertification(userId, id);
    const parts = unwrap(validateUpdateParts(body, document));
    if (parts.title != null) {
      await this.assertAvailableTitle(userId, parts.title, id);
    }
    const documentUrl =
      parts.document == null
        ? existing.documentUrl
        : await this.uploadDocument(userId, parts.document);
    const changes = {
      title: parts.title ?? existing.title,
      description: parts.description ?? existing.description,
      documentUrl,
    };
    try {
      await this.repository.saveFields(id, changes);
    } catch (error) {
      if (parts.document != null) {
        await this.removeStoredDocument(documentUrl);
      }
      if (isUniqueViolation(error)) {
        throw titleTaken();
      }
      throw error;
    }
    if (parts.document != null && existing.documentUrl !== documentUrl) {
      await this.removeStoredDocument(existing.documentUrl);
    }
    return Object.assign(existing, changes);
  }

  async remove(userId: string, id: string): Promise<void> {
    const certification = await this.findOwnedCertification(userId, id);
    await this.repository.hardDelete(id);
    await this.removeStoredDocument(certification.documentUrl);
  }

  async list(userId: string, query: unknown): Promise<ListResult> {
    unwrap(validateUserId(userId));
    const user = await this.repository.findUser(userId);
    if (user == null || user.deletedAt != null) {
      throw userNotFound();
    }
    const parsed: ListQuery = unwrap(validateListQuery(query));
    const { items, total } = await this.repository.findPage(userId, parsed);
    return { items, total, ...parsed };
  }

  async get(userId: string, id: string): Promise<Certification> {
    unwrap(validateUserId(userId));
    const user = await this.repository.findUser(userId);
    if (user == null || user.deletedAt != null) {
      throw userNotFound();
    }
    unwrap(validatePublicCertificationId(id));
    const certification = await this.repository.findOneForUser(userId, id);
    if (certification == null) {
      throw certificationNotFound();
    }
    return certification;
  }
}
