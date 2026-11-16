import {
  type CertificationError,
  invalidCertificationId,
  invalidDescription,
  invalidField,
  invalidFormat,
  invalidId,
  invalidQueryParam,
  invalidTitle,
  invalidUserId,
  missingField,
} from "../errors/certification.errors";

type Validation<T> = { value: T } | { error: CertificationError };

export type CreateCertificationParts = {
  title: string;
  description: string;
  document: Buffer;
};

export type UpdateCertificationParts = {
  title: string | null;
  description: string | null;
  document: Buffer | null;
};

export type ListQuery = { limit: number; page: number };

const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isAbsent(record: Record<string, unknown>, field: string): boolean {
  return !(field in record) || record[field] == null;
}

function isBlank(value: unknown): boolean {
  return typeof value === "string" && value.trim().length === 0;
}

function isPdf(data: Buffer): boolean {
  return data.subarray(0, 4).toString("latin1") === "%PDF";
}

function hasInvalidDocument(document: Buffer): boolean {
  return document.length > MAX_DOCUMENT_BYTES || !isPdf(document);
}

function validateCreateParts(
  body: unknown,
  document: Buffer | undefined,
): Validation<CreateCertificationParts> {
  const record = readRecord(body) ?? {};
  if (isAbsent(record, "title") || isBlank(record.title)) {
    return { error: missingField("title") };
  }
  if (isAbsent(record, "description") || isBlank(record.description)) {
    return { error: missingField("description") };
  }
  if (document == null || document.length === 0) {
    return { error: missingField("document") };
  }
  if (typeof record.title !== "string") {
    return { error: invalidField("title") };
  }
  if (typeof record.description !== "string") {
    return { error: invalidField("description") };
  }
  if (hasInvalidDocument(document)) {
    return { error: invalidFormat() };
  }
  const title = record.title.trim();
  if (title.length > MAX_TITLE_LENGTH) {
    return { error: invalidTitle() };
  }
  const description = record.description.trim();
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return { error: invalidDescription() };
  }
  return { value: { title, description, document } };
}

function validateUpdateParts(
  body: unknown,
  document: Buffer | undefined,
): Validation<UpdateCertificationParts> {
  const record = readRecord(body) ?? {};
  const hasTitle = !isAbsent(record, "title");
  const hasDescription = !isAbsent(record, "description");
  const hasDocument = document != null && document.length > 0;
  if (!hasTitle && !hasDescription && !hasDocument) {
    return { error: missingField("title, description or document") };
  }
  if (hasTitle && isBlank(record.title)) {
    return { error: missingField("title") };
  }
  if (hasDescription && isBlank(record.description)) {
    return { error: missingField("description") };
  }
  if (hasTitle && typeof record.title !== "string") {
    return { error: invalidField("title") };
  }
  if (hasDescription && typeof record.description !== "string") {
    return { error: invalidField("description") };
  }
  if (document != null && document.length > 0 && hasInvalidDocument(document)) {
    return { error: invalidFormat() };
  }
  const title = hasTitle ? (record.title as string).trim() : null;
  if (title != null && title.length > MAX_TITLE_LENGTH) {
    return { error: invalidTitle() };
  }
  const description = hasDescription ? (record.description as string).trim() : null;
  if (description != null && description.length > MAX_DESCRIPTION_LENGTH) {
    return { error: invalidDescription() };
  }
  return {
    value: { title, description, document: document != null && hasDocument ? document : null },
  };
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function validateCertificationId(value: unknown): Validation<string> {
  return isUuid(value) ? { value } : { error: invalidId() };
}

function validateUserId(value: unknown): Validation<string> {
  return isUuid(value) ? { value } : { error: invalidUserId() };
}

function validatePublicCertificationId(value: unknown): Validation<string> {
  return isUuid(value) ? { value } : { error: invalidCertificationId() };
}

function readPositiveInteger(value: unknown, fallback: number, maximum?: number): number | null {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  if (parsed < 1 || (maximum !== undefined && parsed > maximum)) {
    return null;
  }
  return parsed;
}

function validateListQuery(value: unknown): Validation<ListQuery> {
  const record = readRecord(value) ?? {};
  const limit = readPositiveInteger(record.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = readPositiveInteger(record.page, DEFAULT_PAGE);
  if (limit == null || page == null) {
    return { error: invalidQueryParam() };
  }
  return { value: { limit, page } };
}

export {
  validateCertificationId,
  validateCreateParts,
  validateListQuery,
  validatePublicCertificationId,
  validateUpdateParts,
  validateUserId,
};
