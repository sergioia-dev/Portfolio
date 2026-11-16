import { randomUUID } from "node:crypto";
import type Experience from "../../../../shared/database/experience/experience.entity";
import type Language from "../../../../shared/database/language/language.entity";
import { experienceNotFound, languageNotFound, userNotFound } from "../errors/experience.errors";
import type ExperienceRepository from "../repository/experience.repository";
import {
  type ExperienceInput,
  type TranslationInput,
  validateExperienceBody,
  validateExperienceId,
  validateLanguageQuery,
  validateListQuery,
} from "../validators/experience.validators";

export interface ExperienceResponse {
  id: string;
  website_url: string | null;
  start_date: string;
  end_date: string | null;
  translation: {
    language: string;
    title: string;
    description: string;
  };
}

export interface ExperiencePage {
  items: ExperienceResponse[];
  meta: {
    userId: string;
    language: string;
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

const toLanguage = (languages: Language[], name: string): Language => {
  const language = languages.find((entry) => entry.name === name);
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

const toResponse = (experience: Experience, language: Language): ExperienceResponse => {
  const translation = experience.translations.find((entry) => entry.languageId === language.id);
  return {
    id: experience.id,
    website_url: experience.websiteUrl,
    start_date: experience.startDate,
    end_date: experience.endDate,
    translation: {
      language: language.name,
      title: translation?.title ?? "",
      description: translation?.description ?? "",
    },
  };
};

const toTranslationsOrThrow = (body: unknown, languages: Language[]): ExperienceInput => {
  const validation = validateExperienceBody(
    body,
    languages.map((language) => language.name),
  );
  if ("error" in validation) throw validation.error;
  return validation.value;
};

export default class ExperienceService {
  constructor(private readonly repository: ExperienceRepository) {}

  async create(userId: string, body: unknown): Promise<{ id: string }> {
    const languages = await this.repository.findLanguages();
    const input = toTranslationsOrThrow(body, languages);
    const id = randomUUID();

    await this.repository.create({
      id,
      userId,
      websiteUrl: input.websiteUrl,
      startDate: input.startDate,
      endDate: input.endDate,
      translations: toTranslations(input.translations, languages),
    });

    return { id };
  }

  async update(userId: string, id: string, body: unknown): Promise<{ id: string }> {
    validateExperienceId(id);
    const existing = await this.repository.findById(id);
    if (!existing || existing.userId !== userId) throw experienceNotFound();

    const languages = await this.repository.findLanguages();
    const input = toTranslationsOrThrow(body, languages);

    await this.repository.saveFields(id, {
      websiteUrl: input.websiteUrl,
      startDate: input.startDate,
      endDate: input.endDate,
    });
    await this.repository.saveTranslations(id, toTranslations(input.translations, languages));

    return { id };
  }

  async remove(userId: string, id: string): Promise<void> {
    validateExperienceId(id);
    const existing = await this.repository.findById(id);
    if (!existing || existing.userId !== userId) throw experienceNotFound();
    await this.repository.hardDelete(id);
  }

  async list(userId: string, query: unknown): Promise<ExperiencePage> {
    validateExperienceId(userId);
    const user = await this.repository.findUser(userId);
    if (!user || user.deletedAt) throw userNotFound();

    const languages = await this.repository.findLanguages();
    const validation = validateListQuery(
      query,
      languages.map((language) => language.name),
    );
    if ("error" in validation) throw validation.error;

    const { language, limit, page, sort } = validation.value;
    const { items, total } = await this.repository.findReadPage(userId, {
      languageId: toLanguage(languages, language).id,
      limit,
      page,
      sort,
    });

    return {
      items: items.map((item) => toResponse(item, toLanguage(languages, language))),
      meta: {
        userId,
        language,
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async get(userId: string, id: string, query: unknown): Promise<ExperienceResponse> {
    validateExperienceId(userId);
    validateExperienceId(id);
    const user = await this.repository.findUser(userId);
    if (!user || user.deletedAt) throw userNotFound();

    const existing = await this.repository.findById(id);
    if (!existing || existing.userId !== userId) throw experienceNotFound();

    const languages = await this.repository.findLanguages();
    const validation = validateLanguageQuery(
      query,
      languages.map((language) => language.name),
    );
    if ("error" in validation) throw validation.error;

    const language = toLanguage(languages, validation.value);
    const found = await this.repository.findReadOne(userId, id, language.id);
    if (!found) throw experienceNotFound();
    return toResponse(found, language);
  }
}
