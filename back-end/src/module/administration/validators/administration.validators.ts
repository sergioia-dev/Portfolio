import {
  type AdministrationError,
  invalidEmail,
  invalidField,
  invalidQueryParam,
  invalidUserId,
  invalidUsername,
  missingField,
} from "../errors/administration.errors";

type Validation<T> = { value: T } | { error: AdministrationError };

export interface SearchQueryInput {
  query: string;
  includeDeleted: boolean;
  limit: number;
  page: number;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
}

const MAX_QUERY_LENGTH = 255;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;
const USERNAME_MAX_LENGTH = 39;
const EMAIL_MAX_LENGTH = 255;
const USERNAME_PATTERN = /^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const readRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readPositiveInteger = (value: unknown, fallback: number, maximum?: number): number | null => {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (parsed < 1 || (maximum !== undefined && parsed > maximum)) return null;
  return parsed;
};

export const validateSearchQuery = (value: unknown): Validation<SearchQueryInput> => {
  const record = readRecord(value) ?? {};
  const rawQuery = record.query;
  if (typeof rawQuery !== "string" || rawQuery.trim() === "") {
    return { error: missingField("query") };
  }
  if (rawQuery.length > MAX_QUERY_LENGTH) {
    return { error: invalidQueryParam() };
  }

  const limit = readPositiveInteger(record.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = readPositiveInteger(record.page, DEFAULT_PAGE);
  if (limit === null || page === null) {
    return { error: invalidQueryParam() };
  }

  let includeDeleted = false;
  if (record.include_deleted !== undefined) {
    if (record.include_deleted !== "true" && record.include_deleted !== "false") {
      return { error: invalidQueryParam() };
    }
    includeDeleted = record.include_deleted === "true";
  }

  return { value: { query: rawQuery.trim(), includeDeleted, limit, page } };
};

export const validateUpdate = (body: unknown): Validation<UpdateUserInput> => {
  const record = readRecord(body);
  if (!record) return { error: invalidField("body") };

  for (const key of Object.keys(record)) {
    if (key !== "username" && key !== "email") return { error: invalidField(key) };
  }
  if (record.username === undefined && record.email === undefined) {
    return { error: invalidField("body") };
  }

  if (record.username !== undefined) {
    if (
      typeof record.username !== "string" ||
      record.username.length > USERNAME_MAX_LENGTH ||
      !USERNAME_PATTERN.test(record.username)
    ) {
      return { error: invalidUsername() };
    }
  }

  if (record.email !== undefined) {
    if (
      typeof record.email !== "string" ||
      record.email.length > EMAIL_MAX_LENGTH ||
      !EMAIL_PATTERN.test(record.email)
    ) {
      return { error: invalidEmail() };
    }
  }

  const value: UpdateUserInput = {};
  if (typeof record.username === "string") value.username = record.username;
  if (typeof record.email === "string") value.email = record.email;
  return { value };
};

export const validateUserId = (value: unknown): Validation<string> =>
  typeof value === "string" && UUID_PATTERN.test(value) ? { value } : { error: invalidUserId() };
