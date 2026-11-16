import type { DataSource, FindOptionsOrder, FindOptionsWhere } from "typeorm";
import { In, Not } from "typeorm";
import Language from "../../../../shared/database/language/language.entity";
import Project from "../../../../shared/database/project/project.entity";
import ProjectTranslation from "../../../../shared/database/project/project_translation.entity";
import Tag from "../../../../shared/database/tag/tag.entity";
import User from "../../../../shared/database/user/user.entity";
import type { SortOption } from "../validators/project.validators";

export interface ProjectFields {
  repositoryUrl: string;
  websiteUrl: string | null;
}

export interface TranslationFields {
  languageId: string;
  title: string;
  description: string;
}

export interface NewProject extends ProjectFields {
  id: string;
  userId: string;
  tagIds: string[];
  translations: TranslationFields[];
}

export interface PageRequest {
  languageId: string;
  tagId: string | null;
  limit: number;
  page: number;
  sort: SortOption;
}

const ORDER_BY_SORT: Record<SortOption, FindOptionsOrder<Project>> = {
  title_asc: { translations: { title: "ASC" }, id: "ASC" },
};

export default class ProjectRepository {
  constructor(private readonly dataSource: DataSource) {}

  findLanguages(): Promise<Language[]> {
    return this.dataSource.getRepository(Language).find();
  }

  findUser(id: string): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({ where: { id } });
  }

  findTags(userId: string, ids: string[]): Promise<Tag[]> {
    return this.dataSource.getRepository(Tag).find({ where: { id: In(ids), userId } });
  }

  findById(id: string): Promise<Project | null> {
    return this.dataSource.getRepository(Project).findOne({
      where: { id },
      relations: { translations: true, tags: true },
    });
  }

  async create(input: NewProject): Promise<void> {
    const repository = this.dataSource.getRepository(Project);
    await repository.save(
      repository.create({
        id: input.id,
        userId: input.userId,
        repositoryUrl: input.repositoryUrl,
        websiteUrl: input.websiteUrl,
      }),
    );
    await this.saveTranslations(input.id, input.translations);
    await this.saveTags(input.id, input.tagIds);
  }

  async saveFields(id: string, fields: ProjectFields): Promise<void> {
    await this.dataSource.getRepository(Project).update({ id }, fields);
  }

  async saveTranslations(id: string, translations: TranslationFields[]): Promise<void> {
    const repository = this.dataSource.getRepository(ProjectTranslation);
    await repository.save(
      translations.map((translation) => repository.create({ id, ...translation })),
    );
    await repository.delete({
      id,
      languageId: Not(In(translations.map((translation) => translation.languageId))),
    });
  }

  async saveTags(id: string, tagIds: string[]): Promise<void> {
    const repository = this.dataSource.getRepository(Project);
    const project = await repository.findOne({ where: { id }, relations: { tags: true } });
    const existingIds = (project?.tags ?? []).map((tag) => tag.id);
    const addIds = tagIds.filter((tagId) => !existingIds.includes(tagId));
    const removeIds = existingIds.filter((tagId) => !tagIds.includes(tagId));
    if (addIds.length === 0 && removeIds.length === 0) return;
    await repository
      .createQueryBuilder()
      .relation(Project, "tags")
      .of(id)
      .addAndRemove(addIds, removeIds);
  }

  async hardDelete(id: string): Promise<void> {
    await this.dataSource.getRepository(Project).delete({ id });
  }

  findReadOne(userId: string, id: string, languageId: string): Promise<Project | null> {
    return this.dataSource.getRepository(Project).findOne({
      where: { id, user: { id: userId }, translations: { languageId } },
      relations: { translations: true, tags: true },
    });
  }

  async findReadPage(
    userId: string,
    request: PageRequest,
  ): Promise<{ items: Project[]; total: number }> {
    const where: FindOptionsWhere<Project> = {
      user: { id: userId },
      translations: { languageId: request.languageId },
    };
    if (request.tagId !== null) {
      where.tags = { id: request.tagId };
    }
    const [items, total] = await this.dataSource.getRepository(Project).findAndCount({
      where,
      relations: { translations: true, tags: true },
      order: ORDER_BY_SORT[request.sort],
      skip: (request.page - 1) * request.limit,
      take: request.limit,
    });
    return { items, total };
  }
}
