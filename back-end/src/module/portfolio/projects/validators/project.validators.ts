import {
  duplicateLanguage,
  invalidDescription,
  invalidField,
  invalidId,
  invalidQueryParam,
  invalidTitle,
  invalidUrl,
  invalidUserId,
  languageNotFound,
  missingField,
  type ProjectError,
  translationsRequired,
} from "../errors/project.errors";

export interface TranslationInput {
  language: string;
  title: string;
  description: string;
}

export interface ProjectInput {
  repositoryUrl: string;
  websiteUrl: string | null;
  tagIds: string[];
  translations: TranslationInput[];
}

export type SortOption = "title_asc";

export interface ListFilter {
  language: string;
  tagId: string | null;
}

export interface ListPaging {
  limit: number;
  page: number;
  sort: SortOption;
}

export interface ListQuery extends ListFilter, ListPaging {}

type Validation<T> = { value: T } | { error: ProjectError };

const TITLE_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 500;
const URL_MAX_LENGTH = 2048;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;
const DEFAULT_SORT: SortOption = "title_asc";
const SORT_OPTIONS: SortOption[] = ["title_asc"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const readRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readString = (record: Record<string, unknown> | null, field: string): string | null => {
  const value = record?.[field];
  return typeof value === "string" ? value : null;
};

const readInteger = (value: unknown, min: number, max: number): number | null => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= min && parsed <= max ? parsed : null;
};

const normalizeLanguage = (value: string): string => value.trim().toUpperCase();

const matchLanguage = (value: string, languageNames: string[]): string | null =>
  languageNames.find((name) => normalizeLanguage(name) === normalizeLanguage(value)) ?? null;

const isAbsentOrEmpty = (value: unknown): boolean =>
  value === undefined || value === null || value === "";

const isAbsoluteUrl = (value: string): boolean => {
  if (value.length > URL_MAX_LENGTH) return false;
  try {
    return new URL(value).hostname !== "";
  } catch {
    return false;
  }
};

export const isProjectId = (value: string): boolean => UUID_PATTERN.test(value);

export const validateProjectId = (id: string): void => {
  if (!isProjectId(id)) throw invalidId();
};

export const validateUserId = (id: string): void => {
  if (!isProjectId(id)) throw invalidUserId();
};

export const validateProjectBody = (
  body: unknown,
  languageNames: string[],
): Validation<ProjectInput> => {
  const record = readRecord(body);
  const translations = record?.translations;
  if (!Array.isArray(translations) || translations.length === 0) {
    return { error: translationsRequired() };
  }

  const entries = translations.map((entry) => readRecord(entry));
  if (entries.some((entry) => entry === null)) return { error: invalidField("translations") };
  const fields = entries as Record<string, unknown>[];

  const languages = fields
    .map((entry) => readString(entry, "language"))
    .filter((language): language is string => language !== null && language.trim() !== "");
  if (languages.some((language) => matchLanguage(language, languageNames) === null)) {
    return { error: languageNotFound() };
  }
  if (new Set(languages.map(normalizeLanguage)).size !== languages.length) {
    return { error: duplicateLanguage() };
  }

  const repositoryUrl = record?.repository_url;
  if (isAbsentOrEmpty(repositoryUrl)) return { error: missingField() };
  for (const entry of fields) {
    if (
      isAbsentOrEmpty(entry.language) ||
      isAbsentOrEmpty(entry.title) ||
      isAbsentOrEmpty(entry.description)
    ) {
      return { error: missingField() };
    }
  }

  if (typeof repositoryUrl !== "string") return { error: invalidField("repository_url") };
  const websiteUrl = record?.website_url;
  if (websiteUrl !== undefined && websiteUrl !== null && typeof websiteUrl !== "string") {
    return { error: invalidField("website_url") };
  }
  const tagIds = record?.tag_ids;
  if (
    tagIds !== undefined &&
    (!Array.isArray(tagIds) || tagIds.some((tagId) => typeof tagId !== "string"))
  ) {
    return { error: invalidField("tag_ids") };
  }
  for (const entry of fields) {
    if (
      typeof entry.language !== "string" ||
      typeof entry.title !== "string" ||
      typeof entry.description !== "string"
    ) {
      return { error: invalidField("translations") };
    }
  }

  const uniqueTagIds = [...new Set((tagIds ?? []) as string[])];
  if (uniqueTagIds.some((tagId) => !UUID_PATTERN.test(tagId))) return { error: invalidId() };

  return {
    value: {
      repositoryUrl,
      websiteUrl: typeof websiteUrl === "string" && websiteUrl !== "" ? websiteUrl : null,
      tagIds: uniqueTagIds,
      translations: fields.map((entry) => ({
        language: normalizeLanguage(entry.language as string),
        title: entry.title as string,
        description: entry.description as string,
      })),
    },
  };
};

export const validateProjectContent = (input: ProjectInput): void => {
  if (
    !isAbsoluteUrl(input.repositoryUrl) ||
    (input.websiteUrl !== null && !isAbsoluteUrl(input.websiteUrl))
  ) {
    throw invalidUrl();
  }
  if (
    input.translations.some(
      (translation) =>
        translation.title.trim() === "" || translation.title.length > TITLE_MAX_LENGTH,
    )
  ) {
    throw invalidTitle();
  }
  if (
    input.translations.some(
      (translation) =>
        translation.description.trim() === "" ||
        translation.description.length > DESCRIPTION_MAX_LENGTH,
    )
  ) {
    throw invalidDescription();
  }
};

export const validateListFilter = (
  query: unknown,
  languageNames: string[],
): Validation<ListFilter> => {
  const record = readRecord(query);
  const language = readString(record, "language");
  if (language === null || language.trim() === "") return { error: missingField() };
  const matched = matchLanguage(language, languageNames);
  if (matched === null) return { error: languageNotFound() };

  const tagId = record?.tag_id;
  if (tagId === undefined) return { value: { language: matched, tagId: null } };
  if (typeof tagId !== "string" || !UUID_PATTERN.test(tagId)) {
    return { error: invalidId() };
  }
  return { value: { language: matched, tagId } };
};

export const validateListPaging = (query: unknown): Validation<ListPaging> => {
  const record = readRecord(query);
  const limit =
    record?.limit === undefined ? DEFAULT_LIMIT : readInteger(record.limit, 1, MAX_LIMIT);
  const page =
    record?.page === undefined
      ? DEFAULT_PAGE
      : readInteger(record.page, 1, Number.MAX_SAFE_INTEGER);
  const sort =
    record?.sort === undefined
      ? DEFAULT_SORT
      : SORT_OPTIONS.find((option) => option === record.sort);
  if (limit === null || page === null || sort === undefined) {
    return { error: invalidQueryParam() };
  }
  return { value: { limit, page, sort } };
};

export const validateLanguageQuery = (
  query: unknown,
  languageNames: string[],
): Validation<string> => {
  const language = readString(readRecord(query), "language");
  if (language === null || language.trim() === "") return { error: missingField() };
  const matched = matchLanguage(language, languageNames);
  return matched === null ? { error: languageNotFound() } : { value: matched };
};
