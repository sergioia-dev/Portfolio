import {
  duplicateLanguage,
  ExperienceError,
  invalidDateFormat,
  invalidDateRange,
  invalidDescription,
  invalidId,
  invalidQueryParam,
  invalidTitle,
  invalidUrl,
  languageNotFound,
  missingField,
  translationsRequired,
} from "../errors/experience.errors";

export interface TranslationInput {
  language: string;
  title: string;
  description: string;
}

export interface ExperienceInput {
  websiteUrl: string | null;
  startDate: string;
  endDate: string | null;
  translations: TranslationInput[];
}

export type SortOption = "start_date_desc" | "start_date_asc" | "created_at_desc";

export interface ListQuery {
  language: string;
  limit: number;
  page: number;
  sort: SortOption;
}

type Validation<T> = { value: T } | { error: ExperienceError };

const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 1000;
const URL_MAX_LENGTH = 2048;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_PAGE = 1;
const DEFAULT_SORT: SortOption = "start_date_desc";
const SORT_OPTIONS: SortOption[] = ["start_date_desc", "start_date_asc", "created_at_desc"];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const readRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const readString = (record: Record<string, unknown> | null, field: string): string | null => {
  const value = record?.[field];
  return typeof value === "string" ? value : null;
};

const normalizeLanguage = (value: string): string => value.trim().toUpperCase();

const matchLanguage = (value: string, languageNames: string[]): string | null =>
  languageNames.find((name) => normalizeLanguage(name) === normalizeLanguage(value)) ?? null;

const isRealDate = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const isAbsoluteUrl = (value: string): boolean => {
  if (value.length > URL_MAX_LENGTH) return false;
  try {
    return new URL(value).hostname !== "";
  } catch {
    return false;
  }
};

const readEntries = (body: unknown): Record<string, unknown>[] | ExperienceError => {
  const translations = readRecord(body)?.["translations"];
  if (!Array.isArray(translations) || translations.length === 0) return translationsRequired();
  return translations.map((entry) => readRecord(entry) ?? {});
};

export const isExperienceId = (value: string): boolean => UUID_PATTERN.test(value);

export const validateExperienceBody = (
  body: unknown,
  languageNames: string[],
): Validation<ExperienceInput> => {
  const entries = readEntries(body);
  if (entries instanceof ExperienceError) return { error: entries };
  const record = readRecord(body);

  const languages = entries
    .map((entry) => readString(entry, "language"))
    .filter((language): language is string => language !== null && language.trim() !== "");

  if (languages.some((language) => matchLanguage(language, languageNames) === null)) {
    return { error: languageNotFound() };
  }

  if (new Set(languages.map(normalizeLanguage)).size !== languages.length) {
    return { error: duplicateLanguage() };
  }

  const startDate = readString(record, "start_date");
  const endDate = readString(record, "end_date");
  if (!startDate) return { error: missingField() };
  for (const entry of entries) {
    const title = readString(entry, "title");
    const description = readString(entry, "description");
    if (!readString(entry, "language") || !title || !description) return { error: missingField() };
  }

  if (endDate !== null && endDate !== "" && DATE_PATTERN.test(startDate)) {
    if (DATE_PATTERN.test(endDate) && endDate < startDate) return { error: invalidDateRange() };
  }

  const websiteUrl = readString(record, "website_url");
  if (websiteUrl !== null && websiteUrl !== "" && !isAbsoluteUrl(websiteUrl)) {
    return { error: invalidUrl() };
  }

  if (!isRealDate(startDate)) return { error: invalidDateFormat() };
  if (endDate !== null && endDate !== "" && !isRealDate(endDate)) {
    return { error: invalidDateFormat() };
  }

  const titles = entries.map((entry) => readString(entry, "title") as string);
  if (titles.some((title) => title.trim() === "" || title.length > TITLE_MAX_LENGTH)) {
    return { error: invalidTitle() };
  }

  const descriptions = entries.map((entry) => readString(entry, "description") as string);
  if (
    descriptions.some(
      (description) => description.trim() === "" || description.length > DESCRIPTION_MAX_LENGTH,
    )
  ) {
    return { error: invalidDescription() };
  }

  return {
    value: {
      websiteUrl: websiteUrl === null || websiteUrl === "" ? null : websiteUrl,
      startDate,
      endDate: endDate === null || endDate === "" ? null : endDate,
      translations: entries.map((entry, index) => ({
        language: normalizeLanguage(readString(entry, "language") as string),
        title: titles[index],
        description: descriptions[index],
      })),
    },
  };
};

const readQueryLanguage = (query: unknown, languageNames: string[]): Validation<string> => {
  const language = readString(readRecord(query), "language");
  if (language === null || language.trim() === "") return { error: missingField() };
  const matched = matchLanguage(language, languageNames);
  return matched === null ? { error: languageNotFound() } : { value: matched };
};

const readInteger = (value: unknown, min: number, max: number): number | null => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= min && parsed <= max ? parsed : null;
};

export const validateLanguageQuery = (
  query: unknown,
  languageNames: string[],
): Validation<string> => readQueryLanguage(query, languageNames);

export const validateListQuery = (
  query: unknown,
  languageNames: string[],
): Validation<ListQuery> => {
  const language = readQueryLanguage(query, languageNames);
  if ("error" in language) return language;

  const record = readRecord(query);
  const rawLimit = record?.["limit"];
  const rawPage = record?.["page"];
  const rawSort = record?.["sort"];

  const limit = rawLimit === undefined ? DEFAULT_LIMIT : readInteger(rawLimit, 1, MAX_LIMIT);
  const page =
    rawPage === undefined ? DEFAULT_PAGE : readInteger(rawPage, 1, Number.MAX_SAFE_INTEGER);
  const sort =
    rawSort === undefined ? DEFAULT_SORT : SORT_OPTIONS.find((option) => option === rawSort);

  if (limit === null || page === null || sort === undefined) return { error: invalidQueryParam() };

  return { value: { language: language.value, limit, page, sort } };
};

export const validateExperienceId = (id: string): void => {
  if (!isExperienceId(id)) throw invalidId();
};
