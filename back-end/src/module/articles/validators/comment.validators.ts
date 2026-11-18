import {
  type ArticleError,
  invalidField,
  invalidId,
  invalidQueryParam,
  missingField,
} from "../errors/article.errors";

export interface CommentInput {
  comment: string;
  parentCommentId: string | null;
}

export interface CommentPaging {
  limit: number;
  page: number;
}

type Validation<T> = { value: T } | { error: ArticleError };

const COMMENT_MAX_LENGTH = 1000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const readRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readInteger = (value: unknown, min: number, max: number): number | null => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= min && parsed <= max ? parsed : null;
};

export const validateCommentId = (id: string): void => {
  if (!UUID_PATTERN.test(id)) throw invalidId();
};

export const validateCommentBody = (body: unknown): Validation<CommentInput> => {
  const record = readRecord(body);
  const comment = record?.comment;
  if (comment === undefined || comment === null || comment === "") {
    return { error: missingField() };
  }
  if (typeof comment !== "string" || comment.length > COMMENT_MAX_LENGTH) {
    return { error: invalidField("comment") };
  }

  const parent = record?.parent_comment;
  if (parent === undefined || parent === null) {
    return { value: { comment, parentCommentId: null } };
  }
  if (typeof parent !== "string") return { error: invalidField("parent_comment") };
  if (!UUID_PATTERN.test(parent)) return { error: invalidId() };
  return { value: { comment, parentCommentId: parent } };
};

export const validateCommentUpdate = (body: unknown): Validation<string> => {
  const comment = readRecord(body)?.comment;
  if (comment === undefined || comment === null || comment === "") {
    return { error: missingField() };
  }
  if (typeof comment !== "string" || comment.length > COMMENT_MAX_LENGTH) {
    return { error: invalidField("comment") };
  }
  return { value: comment };
};

export const validateCommentPaging = (query: unknown): Validation<CommentPaging> => {
  const record = readRecord(query);
  const limit =
    record?.limit === undefined ? DEFAULT_LIMIT : readInteger(record.limit, 1, MAX_LIMIT);
  const page =
    record?.page === undefined
      ? DEFAULT_PAGE
      : readInteger(record.page, 1, Number.MAX_SAFE_INTEGER);
  if (limit === null || page === null) return { error: invalidQueryParam() };
  return { value: { limit, page } };
};
