import { randomUUID } from "node:crypto";
import type Language from "../../../../shared/database/language/language.entity";
import type Project from "../../../../shared/database/project/project.entity";
import type Tag from "../../../../shared/database/tag/tag.entity";
import {
  languageNotFound,
  projectNotFound,
  tagNotFound,
  userNotFound,
} from "../errors/project.errors";
import type ProjectRepository from "../repository/project.repository";
import {
  type ProjectInput,
  type TranslationInput,
  validateLanguageQuery,
  validateListFilter,
  validateListPaging,
  validateProjectBody,
  validateProjectContent,
  validateProjectId,
  validateUserId,
} from "../validators/project.validators";

export interface TagResponse {
  id: string;
  name: string;
}

export interface TranslationResponse {
  language: string;
  title: string;
  description: string;
}

export interface ProjectDetailResponse {
  id: string;
  repository_url: string;
  website_url: string | null;
  tags: TagResponse[];
  translations: TranslationResponse[];
}

export interface ProjectResponse {
  id: string;
  repository_url: string;
  website_url: string | null;
  tags: TagResponse[];
  translation: TranslationResponse;
}

export interface ProjectPage {
  items: ProjectResponse[];
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

const toTags = (tags: Tag[]): TagResponse[] => tags.map((tag) => ({ id: tag.id, name: tag.name }));

const toTranslation = (project: Project, language: Language): TranslationResponse => {
  const translation = project.translations.find((entry) => entry.languageId === language.id);
  return {
    language: language.name,
    title: translation?.title ?? "",
    description: translation?.description ?? "",
  };
};

const toDetail = (id: string, input: ProjectInput, tags: Tag[]): ProjectDetailResponse => ({
  id,
  repository_url: input.repositoryUrl,
  website_url: input.websiteUrl,
  tags: toTags(tags),
  translations: input.translations.map((translation) => ({
    language: translation.language,
    title: translation.title,
    description: translation.description,
  })),
});

const toResponse = (project: Project, language: Language): ProjectResponse => ({
  id: project.id,
  repository_url: project.repositoryUrl,
  website_url: project.websiteUrl,
  tags: toTags(project.tags),
  translation: toTranslation(project, language),
});

export default class ProjectService {
  constructor(private readonly repository: ProjectRepository) {}

  private async findOwnedTags(userId: string, tagIds: string[]): Promise<Tag[]> {
    if (tagIds.length === 0) return [];
    const tags = await this.repository.findTags(userId, tagIds);
    if (tags.length !== tagIds.length) throw tagNotFound();
    return tagIds
      .map((tagId) => tags.find((tag) => tag.id === tagId))
      .filter((tag): tag is Tag => tag !== undefined);
  }

  private parseBody(body: unknown, languages: Language[]): ProjectInput {
    const validation = validateProjectBody(
      body,
      languages.map((language) => language.name),
    );
    if ("error" in validation) throw validation.error;
    return validation.value;
  }

  async create(userId: string, body: unknown): Promise<ProjectDetailResponse> {
    const languages = await this.repository.findLanguages();
    const input = this.parseBody(body, languages);
    const tags = await this.findOwnedTags(userId, input.tagIds);
    validateProjectContent(input);

    const id = randomUUID();
    await this.repository.create({
      id,
      userId,
      repositoryUrl: input.repositoryUrl,
      websiteUrl: input.websiteUrl,
      tagIds: input.tagIds,
      translations: toTranslations(input.translations, languages),
    });

    return toDetail(id, input, tags);
  }

  async update(userId: string, id: string, body: unknown): Promise<ProjectDetailResponse> {
    validateProjectId(id);
    const existing = await this.repository.findById(id);
    if (!existing || existing.userId !== userId) throw projectNotFound();

    const languages = await this.repository.findLanguages();
    const input = this.parseBody(body, languages);
    const tags = await this.findOwnedTags(userId, input.tagIds);
    validateProjectContent(input);

    await this.repository.saveFields(id, {
      repositoryUrl: input.repositoryUrl,
      websiteUrl: input.websiteUrl,
    });
    await this.repository.saveTranslations(id, toTranslations(input.translations, languages));
    await this.repository.saveTags(id, input.tagIds);

    return toDetail(id, input, tags);
  }

  async remove(userId: string, id: string): Promise<void> {
    validateProjectId(id);
    const existing = await this.repository.findById(id);
    if (!existing || existing.userId !== userId) throw projectNotFound();
    await this.repository.hardDelete(id);
  }

  async list(userId: string, query: unknown): Promise<ProjectPage> {
    validateUserId(userId);
    const user = await this.repository.findUser(userId);
    if (!user || user.deletedAt) throw userNotFound();

    const languages = await this.repository.findLanguages();
    const filter = validateListFilter(
      query,
      languages.map((language) => language.name),
    );
    if ("error" in filter) throw filter.error;
    if (filter.value.tagId !== null) {
      await this.findOwnedTags(userId, [filter.value.tagId]);
    }

    const paging = validateListPaging(query);
    if ("error" in paging) throw paging.error;

    const language = toLanguage(languages, filter.value.language);
    const { limit, page, sort } = paging.value;
    const { items, total } = await this.repository.findReadPage(userId, {
      languageId: language.id,
      tagId: filter.value.tagId,
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

  async get(userId: string, id: string, query: unknown): Promise<ProjectResponse> {
    validateUserId(userId);
    validateProjectId(id);
    const user = await this.repository.findUser(userId);
    if (!user || user.deletedAt) throw userNotFound();

    const existing = await this.repository.findById(id);
    if (!existing || existing.userId !== userId) throw projectNotFound();

    const languages = await this.repository.findLanguages();
    const validation = validateLanguageQuery(
      query,
      languages.map((language) => language.name),
    );
    if ("error" in validation) throw validation.error;

    const language = toLanguage(languages, validation.value);
    const found = await this.repository.findReadOne(userId, id, language.id);
    if (!found) throw projectNotFound();
    return toResponse(found, language);
  }
}
