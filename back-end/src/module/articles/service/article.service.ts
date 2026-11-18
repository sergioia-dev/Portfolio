import { randomUUID } from "node:crypto";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import type Article from "../../../shared/database/article/article.entity";
import type Language from "../../../shared/database/language/language.entity";
import type Tag from "../../../shared/database/tag/tag.entity";
import {
  articleNotFound,
  languageNotFound,
  preconditionFailed,
  tagNotFound,
  userNotFound,
} from "../errors/article.errors";
import type ArticleRepository from "../repository/article.repository";
import type { TranslationFields } from "../repository/article.repository";
import type { ArticleInput, ListPaging, TranslationInput } from "../validators/article.validators";
import {
  validateArticleBody,
  validateArticleContent,
  validateArticleId,
  validateLanguageQuery,
  validateListFilter,
  validateListPaging,
  validateOnlyHtml,
  validateUserId,
} from "../validators/article.validators";

export interface ArticleTagResponse {
  id: string;
  name: string;
}

export interface ArticleTranslationResponse {
  language: string;
  title: string;
  description: string;
  rawMarkdown: string;
  renderedHtml: string;
  updatedAt: Date;
}

export interface ArticleTranslationSummary {
  language: string;
  title: string;
  description: string;
  updatedAt: Date;
}

export interface ArticleDetailResponse {
  id: string;
  tags: ArticleTagResponse[];
  translations: ArticleTranslationResponse[];
}

export interface ArticleSummaryResponse {
  id: string;
  tags: ArticleTagResponse[];
  translation: ArticleTranslationSummary;
}

export interface ArticleGetResponse {
  id: string;
  tags: ArticleTagResponse[];
  translation: ArticleTranslationResponse | Omit<ArticleTranslationResponse, "rawMarkdown">;
}

export interface ArticlePage {
  items: ArticleSummaryResponse[];
  meta: {
    userId: string;
    language: string;
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

const MARKDOWN_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "br",
  "hr",
  "strong",
  "em",
  "del",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
  "code",
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

const MARKDOWN_ATTRIBUTES = {
  a: ["href", "title"],
  code: ["class"],
};

export const renderMarkdown = (raw: string): string =>
  sanitizeHtml(marked.parse(raw), {
    allowedTags: MARKDOWN_TAGS,
    allowedAttributes: MARKDOWN_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
  });

const toLanguage = (languages: Language[], name: string): Language => {
  const language = languages.find(
    (candidate) => candidate.name.toUpperCase() === name.trim().toUpperCase(),
  );
  if (language === undefined) throw languageNotFound();
  return language;
};

const toTags = (tags: Tag[]): ArticleTagResponse[] =>
  tags.map((tag) => ({ id: tag.id, name: tag.name }));

const toTranslations = (
  translations: TranslationInput[],
  languages: Language[],
  existing: TranslationFields[],
): TranslationFields[] => {
  const previous = new Map(existing.map((translation) => [translation.languageId, translation]));
  return translations.map((translation) => {
    const language = toLanguage(languages, translation.language);
    const before = previous.get(language.id);
    const changed = before === undefined || before.rawMarkdown !== translation.rawMarkdown;
    return {
      languageId: language.id,
      title: translation.title,
      description: translation.description,
      rawMarkdown: translation.rawMarkdown,
      renderedHtml: changed ? renderMarkdown(translation.rawMarkdown) : before.renderedHtml,
      updatedAt: changed ? new Date() : before.updatedAt,
    };
  });
};

const languageNames = (languages: Language[]): Map<string, string> =>
  new Map(languages.map((language) => [language.id, language.name]));

const toTranslation = (
  translation: TranslationFields,
  names: Map<string, string>,
): ArticleTranslationResponse => ({
  language: names.get(translation.languageId) ?? "",
  title: translation.title,
  description: translation.description,
  rawMarkdown: translation.rawMarkdown,
  renderedHtml: translation.renderedHtml,
  updatedAt: translation.updatedAt,
});

const toDetail = (article: Article, languages: Language[]): ArticleDetailResponse => {
  const names = languageNames(languages);
  return {
    id: article.id,
    tags: toTags(article.tags),
    translations: article.translations.map((translation) => toTranslation(translation, names)),
  };
};

export default class ArticleService {
  constructor(private readonly repository: ArticleRepository) {}

  async create(userId: string, body: unknown): Promise<ArticleDetailResponse> {
    const languages = await this.repository.findLanguages();
    const input = this.parseBody(body, languages);
    const tags = await this.findOwnedTags(userId, input.tagIds);
    validateArticleContent(input);

    const id = randomUUID();
    await this.repository.create({
      id,
      userId,
      tagIds: tags.map((tag) => tag.id),
      translations: toTranslations(input.translations, languages, []),
    });
    const created = await this.repository.findById(id);
    if (created === null) throw articleNotFound();
    return toDetail(created, languages);
  }

  async update(
    userId: string,
    id: string,
    body: unknown,
    ifMatch: string | null,
  ): Promise<ArticleDetailResponse> {
    validateArticleId(id);
    const existing = await this.repository.findById(id);
    if (existing === null || existing.userId !== userId) throw articleNotFound();
    if (ifMatch !== null && ifMatch !== this.latestUpdatedAt(existing).toISOString()) {
      throw preconditionFailed();
    }

    const languages = await this.repository.findLanguages();
    const input = this.parseBody(body, languages);
    const tags = await this.findOwnedTags(userId, input.tagIds);
    validateArticleContent(input);

    await this.repository.update(
      id,
      toTranslations(input.translations, languages, existing.translations),
      tags.map((tag) => tag.id),
    );
    const updated = await this.repository.findById(id);
    if (updated === null) throw articleNotFound();
    return toDetail(updated, languages);
  }

  async remove(userId: string, id: string, ifMatch: string | null): Promise<void> {
    validateArticleId(id);
    const existing = await this.repository.findOwned(id, userId);
    if (existing === null) throw articleNotFound();
    if (ifMatch !== null && ifMatch !== this.latestUpdatedAt(existing).toISOString()) {
      throw preconditionFailed();
    }
    if (existing.isDeleted) return;
    await this.repository.softDelete(id);
  }

  async list(userId: string, query: unknown): Promise<ArticlePage> {
    validateUserId(userId);
    const user = await this.repository.findUser(userId);
    if (user === null || user.isDeleted) throw userNotFound();

    const languages = await this.repository.findLanguages();
    const filter = this.unwrap(
      validateListFilter(
        query,
        languages.map(({ name }) => name),
      ),
    );
    const paging = this.unwrap(validateListPaging(query));
    const language = toLanguage(languages, filter.language);
    if (filter.tagId !== null) {
      const tag = await this.repository.findTags(userId, [filter.tagId]);
      if (tag.length === 0) throw tagNotFound();
    }

    const page = await this.repository.findReadPage(userId, {
      languageId: language.id,
      tagId: filter.tagId,
      ...paging,
    });
    const names = languageNames(languages);
    return {
      items: page.items.map((article) => this.toSummary(article, names)),
      meta: this.toMeta(userId, language.name, paging, page.total),
    };
  }

  async get(userId: string, id: string, query: unknown): Promise<ArticleGetResponse> {
    validateUserId(userId);
    validateArticleId(id);
    const user = await this.repository.findUser(userId);
    if (user === null || user.isDeleted) throw userNotFound();

    const existing = await this.repository.findOwned(id, userId);
    if (existing === null || existing.isDeleted) throw articleNotFound();

    const languages = await this.repository.findLanguages();
    const language = toLanguage(
      languages,
      this.unwrap(
        validateLanguageQuery(
          query,
          languages.map(({ name }) => name),
        ),
      ),
    );
    const onlyHtml = validateOnlyHtml(query);

    const article = await this.repository.findReadOne(userId, id, language.id);
    if (article === null) throw articleNotFound();
    const translation = article.translations.find(
      (candidate) => candidate.languageId === language.id,
    );
    if (translation === undefined) throw articleNotFound();

    const response = toTranslation(translation, languageNames(languages));
    const { rawMarkdown, ...withoutMarkdown } = response;
    return {
      id: article.id,
      tags: toTags(article.tags),
      translation: onlyHtml ? withoutMarkdown : response,
    };
  }

  private parseBody(body: unknown, languages: Language[]): ArticleInput {
    return this.unwrap(
      validateArticleBody(
        body,
        languages.map(({ name }) => name),
      ),
    );
  }

  private unwrap<T>(result: { value: T } | { error: Error }): T {
    if ("error" in result) throw result.error;
    return result.value;
  }

  private async findOwnedTags(userId: string, tagIds: string[]): Promise<Tag[]> {
    if (tagIds.length === 0) return [];
    const tags = await this.repository.findTags(userId, tagIds);
    if (tags.length !== tagIds.length) throw tagNotFound();
    const byId = new Map(tags.map((tag) => [tag.id, tag]));
    return tagIds.map((tagId) => byId.get(tagId) as Tag);
  }

  private latestUpdatedAt(article: Article): Date {
    return new Date(
      Math.max(...article.translations.map((translation) => translation.updatedAt.getTime())),
    );
  }

  private toSummary(article: Article, names: Map<string, string>): ArticleSummaryResponse {
    const [translation] = article.translations;
    if (translation === undefined) throw articleNotFound();
    return {
      id: article.id,
      tags: toTags(article.tags),
      translation: {
        language: names.get(translation.languageId) ?? "",
        title: translation.title,
        description: translation.description,
        updatedAt: translation.updatedAt,
      },
    };
  }

  private toMeta(
    userId: string,
    language: string,
    paging: ListPaging,
    total: number,
  ): ArticlePage["meta"] {
    return {
      userId,
      language,
      page: paging.page,
      limit: paging.limit,
      total,
      total_pages: Math.ceil(total / paging.limit),
    };
  }
}
