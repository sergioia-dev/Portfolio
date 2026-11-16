import {
  type ContributionError,
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
  translationsRequired,
} from "../errors/contribution.errors";

export interface TranslationInput {
  language: string;
  title: string;
  description: string;
}

export interface ContributionInput {
  projectUrl: string | null;
  pullRequestUrl: string | null;
  translations: TranslationInput[];
}

export type SortOption = "title_asc";

export interface ListPaging {
  limit: number;
  page: number;
  sort: SortOption;
}

type Validation<T> = { value: T } | { error: ContributionError };

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

export const isContributionId = (value: string): boolean => UUID_PATTERN.test(value);

export const validateContributionId = (id: string): void => {
  if (!isContributionId(id)) throw invalidId();
};

export const validateUserId = (id: string): void => {
  if (!isContributionId(id)) throw invalidUserId();
};

export const validateContributionBody = (
  body: unknown,
  languageNames: string[],
): Validation<ContributionInput> => {
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

  for (const entry of fields) {
    if (
      isAbsentOrEmpty(entry.language) ||
      isAbsentOrEmpty(entry.title) ||
      isAbsentOrEmpty(entry.description)
    ) {
      return { error: missingField() };
    }
  }

  const projectUrl = record?.project_url;
  if (projectUrl !== undefined && projectUrl !== null && typeof projectUrl !== "string") {
    return { error: invalidField("project_url") };
  }
  const pullRequestUrl = record?.pull_request_url;
  if (
    pullRequestUrl !== undefined &&
    pullRequestUrl !== null &&
    typeof pullRequestUrl !== "string"
  ) {
    return { error: invalidField("pull_request_url") };
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

  return {
    value: {
      projectUrl: typeof projectUrl === "string" && projectUrl !== "" ? projectUrl : null,
      pullRequestUrl:
        typeof pullRequestUrl === "string" && pullRequestUrl !== "" ? pullRequestUrl : null,
      translations: fields.map((entry) => ({
        language: normalizeLanguage(entry.language as string),
        title: entry.title as string,
        description: entry.description as string,
      })),
    },
  };
};

export const validateContributionContent = (input: ContributionInput): void => {
  if (
    (input.projectUrl !== null && !isAbsoluteUrl(input.projectUrl)) ||
    (input.pullRequestUrl !== null && !isAbsoluteUrl(input.pullRequestUrl))
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
