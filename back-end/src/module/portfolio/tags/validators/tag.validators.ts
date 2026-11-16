import {
  invalidField,
  invalidId,
  invalidImage,
  invalidName,
  invalidQueryParam,
  missingField,
  type TagError,
} from "../errors/tag.errors";

type Validation<T> = { value: T } | { error: TagError };

const MAX_NAME_LENGTH = 50;
const MAX_IMAGE_BYTES = 256 * 1024;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function validateTagName(value: unknown): Validation<string> {
  const record = readRecord(value);
  if (record == null || !("name" in record) || record.name == null) {
    return { error: missingField("name") };
  }
  if (typeof record.name !== "string") {
    return { error: invalidName() };
  }
  const name = record.name.trim();
  if (name.length === 0 || name.length > MAX_NAME_LENGTH || hasControlCharacter(name)) {
    return { error: invalidName() };
  }
  return { value: name };
}

function validateFilterable(value: unknown, required = false): Validation<boolean> {
  const record = readRecord(value);
  if (record == null || record.filterable == null) {
    return required ? { error: missingField("filterable") } : { value: true };
  }
  if (record.filterable !== "true" && record.filterable !== "false") {
    return { error: invalidField("filterable") };
  }
  return { value: record.filterable === "true" };
}

function validateRemoveImage(value: unknown): Validation<boolean> {
  const record = readRecord(value);
  if (record == null || record.remove_image == null) {
    return { value: false };
  }
  if (record.remove_image !== "true" && record.remove_image !== "false") {
    return { error: invalidField("remove_image") };
  }
  return { value: record.remove_image === "true" };
}

function validateTagId(value: unknown, kind = "tag"): Validation<string> {
  return typeof value === "string" && UUID_PATTERN.test(value)
    ? { value }
    : { error: invalidId(kind) };
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

function validateListQuery(value: unknown): Validation<{
  filterable: boolean | null;
  limit: number;
  page: number;
}> {
  const record = readRecord(value) ?? {};
  const limit = readPositiveInteger(record.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = readPositiveInteger(record.page, DEFAULT_PAGE);
  if (limit == null || page == null) {
    return { error: invalidQueryParam() };
  }
  if (record.filterable === undefined) {
    return { value: { filterable: null, limit, page } };
  }
  if (record.filterable !== "true" && record.filterable !== "false") {
    return { error: invalidQueryParam() };
  }
  return { value: { filterable: record.filterable === "true", limit, page } };
}

function isSvg(data: Buffer): boolean {
  const content = data
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .trimStart();
  return content.startsWith("<svg") || (content.startsWith("<?xml") && content.includes("<svg"));
}

function validateImage(data: Buffer | undefined): Validation<Buffer | null> {
  if (data === undefined) {
    return { value: null };
  }
  if (data.length === 0 || data.length > MAX_IMAGE_BYTES || !isSvg(data)) {
    return { error: invalidImage() };
  }
  return { value: data };
}

export {
  isSvg,
  validateFilterable,
  validateImage,
  validateListQuery,
  validateRemoveImage,
  validateTagId,
  validateTagName,
};
