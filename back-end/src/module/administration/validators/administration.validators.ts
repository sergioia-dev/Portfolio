import {
  type AdministrationError,
  invalidDescription,
  invalidEmail,
  invalidField,
  invalidId,
  invalidName,
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
  rolId?: string;
}

export interface RoleInput {
  name: string;
  description: string;
  functionalityIds: string[];
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
const ROLE_NAME_MAX_LENGTH = 100;
const ROLE_DESCRIPTION_MAX_LENGTH = 500;

const readRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const hasControlCharacter = (value: string): boolean =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });

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
    if (key !== "username" && key !== "email" && key !== "rol_id") {
      return { error: invalidField(key) };
    }
  }
  if (record.username === undefined && record.email === undefined && record.rol_id === undefined) {
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

  if (record.rol_id !== undefined) {
    if (typeof record.rol_id !== "string" || !UUID_PATTERN.test(record.rol_id)) {
      return { error: invalidId() };
    }
  }

  const value: UpdateUserInput = {};
  if (typeof record.username === "string") value.username = record.username;
  if (typeof record.email === "string") value.email = record.email;
  if (typeof record.rol_id === "string") value.rolId = record.rol_id;
  return { value };
};

export const validateUserId = (value: unknown): Validation<string> =>
  typeof value === "string" && UUID_PATTERN.test(value) ? { value } : { error: invalidUserId() };

export const validateRoleId = (value: unknown): Validation<string> =>
  typeof value === "string" && UUID_PATTERN.test(value) ? { value } : { error: invalidId() };

const validateRoleBody = (
  body: unknown,
  functionalityIdsRequired: boolean,
): Validation<RoleInput> => {
  const record = readRecord(body);
  if (!record) return { error: invalidField("body") };

  for (const key of Object.keys(record)) {
    if (key !== "name" && key !== "description" && key !== "functionality_ids") {
      return { error: invalidField(key) };
    }
  }

  if (record.name === undefined || record.name === null) {
    return { error: missingField("name") };
  }
  if (record.description === undefined || record.description === null) {
    return { error: missingField("description") };
  }
  if (
    functionalityIdsRequired &&
    (record.functionality_ids === undefined || record.functionality_ids === null)
  ) {
    return { error: missingField("functionality_ids") };
  }

  if (typeof record.name !== "string" || record.name.trim().length > ROLE_NAME_MAX_LENGTH) {
    return { error: invalidField("name") };
  }
  if (typeof record.description !== "string") {
    return { error: invalidField("description") };
  }
  const rawIds = record.functionality_ids ?? [];
  if (!Array.isArray(rawIds) || rawIds.some((id) => typeof id !== "string")) {
    return { error: invalidField("functionality_ids") };
  }
  const functionalityIds = [...new Set(rawIds as string[])];

  const name = record.name.trim();
  if (name.length === 0 || hasControlCharacter(name)) {
    return { error: invalidName() };
  }

  const description = record.description.trim();
  if (description.length === 0 || description.length > ROLE_DESCRIPTION_MAX_LENGTH) {
    return { error: invalidDescription() };
  }

  if (functionalityIds.some((id) => !UUID_PATTERN.test(id))) {
    return { error: invalidId() };
  }

  return { value: { name, description, functionalityIds } };
};

export const validateCreateRole = (body: unknown): Validation<RoleInput> =>
  validateRoleBody(body, false);

export const validateUpdateRole = (body: unknown): Validation<RoleInput> =>
  validateRoleBody(body, true);
