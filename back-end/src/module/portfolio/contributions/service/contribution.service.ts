import { randomUUID } from "node:crypto";
import type Contribution from "../../../../shared/database/contribution/contribution.entity";
import type Language from "../../../../shared/database/language/language.entity";
import {
  contributionNotFound,
  languageNotFound,
  userNotFound,
} from "../errors/contribution.errors";
import type ContributionRepository from "../repository/contribution.repository";
import {
  type ContributionInput,
  type TranslationInput,
  validateContributionBody,
  validateContributionContent,
  validateContributionId,
  validateLanguageQuery,
  validateListPaging,
  validateUserId,
} from "../validators/contribution.validators";

export interface TranslationResponse {
  language: string;
  title: string;
  description: string;
}

export interface ContributionDetailResponse {
  id: string;
  project_url: string | null;
  pull_request_url: string | null;
  translations: TranslationResponse[];
}

export interface ContributionResponse {
  id: string;
  project_url: string | null;
  pull_request_url: string | null;
  translation: TranslationResponse;
}

export interface ContributionPage {
  items: ContributionResponse[];
  meta: {
    userId: string;
    language: string;
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

const normalizeLanguage = (value: string): string => value.trim().toUpperCase();

const toLanguage = (languages: Language[], name: string): Language => {
  const language = languages.find(
    (entry) => normalizeLanguage(entry.name) === normalizeLanguage(name),
  );
  if (!language) throw languageNotFound();
  return language;
};

const toTranslations = (
  translations: TranslationInput[],
  languages: Language[],
): { languageId: string; title: string; description: string }[] =>
  translations.map((translation) => ({
    languageId: toLanguage(languages, translation.language).id,
    title: translation.title,
    description: translation.description,
  }));

const toTranslation = (contribution: Contribution, language: Language): TranslationResponse => {
  const translation = contribution.translations.find((entry) => entry.languageId === language.id);
  return {
    language: language.name,
    title: translation?.title ?? "",
    description: translation?.description ?? "",
  };
};

const toDetail = (id: string, input: ContributionInput): ContributionDetailResponse => ({
  id,
  project_url: input.projectUrl,
  pull_request_url: input.pullRequestUrl,
  translations: input.translations.map((translation) => ({
    language: translation.language,
    title: translation.title,
    description: translation.description,
  })),
});

const toResponse = (contribution: Contribution, language: Language): ContributionResponse => ({
  id: contribution.id,
  project_url: contribution.projectUrl,
  pull_request_url: contribution.pullRequestUrl,
  translation: toTranslation(contribution, language),
});

export default class ContributionService {
  constructor(private readonly repository: ContributionRepository) {}

  private parseBody(body: unknown, languages: Language[]): ContributionInput {
    const validation = validateContributionBody(
      body,
      languages.map((language) => language.name),
    );
    if ("error" in validation) throw validation.error;
    return validation.value;
  }

  async create(userId: string, body: unknown): Promise<ContributionDetailResponse> {
    const languages = await this.repository.findLanguages();
    const input = this.parseBody(body, languages);
    validateContributionContent(input);

    const id = randomUUID();
    await this.repository.create({
      id,
      userId,
      projectUrl: input.projectUrl,
      pullRequestUrl: input.pullRequestUrl,
      translations: toTranslations(input.translations, languages),
    });

    return toDetail(id, input);
  }

  async update(userId: string, id: string, body: unknown): Promise<ContributionDetailResponse> {
    validateContributionId(id);
    const existing = await this.repository.findById(id);
    if (!existing || existing.userId !== userId) throw contributionNotFound();

    const languages = await this.repository.findLanguages();
    const input = this.parseBody(body, languages);
    validateContributionContent(input);

    await this.repository.saveFields(id, {
      projectUrl: input.projectUrl,
      pullRequestUrl: input.pullRequestUrl,
    });
    await this.repository.saveTranslations(id, toTranslations(input.translations, languages));

    return toDetail(id, input);
  }

  async remove(userId: string, id: string): Promise<void> {
    validateContributionId(id);
    const existing = await this.repository.findById(id);
    if (!existing || existing.userId !== userId) throw contributionNotFound();
    await this.repository.hardDelete(id);
  }

  async list(userId: string, query: unknown): Promise<ContributionPage> {
    validateUserId(userId);
    const user = await this.repository.findUser(userId);
    if (!user || user.deletedAt) throw userNotFound();

    const languages = await this.repository.findLanguages();
    const validation = validateLanguageQuery(
      query,
      languages.map((language) => language.name),
    );
    if ("error" in validation) throw validation.error;

    const paging = validateListPaging(query);
    if ("error" in paging) throw paging.error;

    const language = toLanguage(languages, validation.value);
    const { limit, page, sort } = paging.value;
    const { items, total } = await this.repository.findReadPage(userId, {
      languageId: language.id,
      limit,
      page,
      sort,
    });

    return {
      items: items.map((item) => toResponse(item, language)),
      meta: {
        userId,
        language: language.name,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async get(userId: string, id: string, query: unknown): Promise<ContributionResponse> {
    validateUserId(userId);
    validateContributionId(id);
    const user = await this.repository.findUser(userId);
    if (!user || user.deletedAt) throw userNotFound();

    const existing = await this.repository.findById(id);
    if (!existing || existing.userId !== userId) throw contributionNotFound();

    const languages = await this.repository.findLanguages();
    const validation = validateLanguageQuery(
      query,
      languages.map((language) => language.name),
    );
    if ("error" in validation) throw validation.error;

    const language = toLanguage(languages, validation.value);
    const found = await this.repository.findReadOne(userId, id, language.id);
    if (!found) throw contributionNotFound();
    return toResponse(found, language);
  }
}
