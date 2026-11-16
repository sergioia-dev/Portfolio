import type { DataSource, FindOptionsOrder } from "typeorm";
import { In, Not } from "typeorm";
import Experience from "../../../../shared/database/experience/experience.entity";
import ExperienceTranslation from "../../../../shared/database/experience/experience_translation.entity";
import Language from "../../../../shared/database/language/language.entity";
import User from "../../../../shared/database/user/user.entity";
import type { SortOption } from "../validators/experience.validators";

export interface ExperienceFields {
  websiteUrl: string | null;
  startDate: string;
  endDate: string | null;
}

export interface TranslationFields {
  languageId: string;
  title: string;
  description: string;
}

export interface NewExperience extends ExperienceFields {
  id: string;
  userId: string;
  translations: TranslationFields[];
}

export interface PageRequest {
  languageId: string;
  limit: number;
  page: number;
  sort: SortOption;
}

const ORDER_BY_SORT: Record<SortOption, FindOptionsOrder<Experience>> = {
  start_date_desc: { startDate: "DESC", id: "DESC" },
  start_date_asc: { startDate: "ASC", id: "ASC" },
};

export default class ExperienceRepository {
  constructor(private readonly dataSource: DataSource) {}

  findLanguages(): Promise<Language[]> {
    return this.dataSource.getRepository(Language).find();
  }

  findUser(id: string): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({ where: { id } });
  }

  findById(id: string): Promise<Experience | null> {
    return this.dataSource.getRepository(Experience).findOne({
      where: { id },
      relations: { translations: true },
    });
  }

  async create(input: NewExperience): Promise<Experience> {
    const repository = this.dataSource.getRepository(Experience);
    const experience = await repository.save(
      repository.create({
        id: input.id,
        userId: input.userId,
        websiteUrl: input.websiteUrl,
        startDate: input.startDate,
        endDate: input.endDate,
      }),
    );
    await this.saveTranslations(input.id, input.translations);
    return experience;
  }

  async saveFields(id: string, fields: ExperienceFields): Promise<void> {
    await this.dataSource.getRepository(Experience).update({ id }, fields);
  }

  async saveTranslations(id: string, translations: TranslationFields[]): Promise<void> {
    const repository = this.dataSource.getRepository(ExperienceTranslation);
    await repository.save(
      translations.map((translation) => repository.create({ id, ...translation })),
    );
    await repository.delete({
      id,
      languageId: Not(In(translations.map((translation) => translation.languageId))),
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.dataSource.getRepository(Experience).delete({ id });
  }

  findReadOne(userId: string, id: string, languageId: string): Promise<Experience | null> {
    return this.dataSource.getRepository(Experience).findOne({
      where: {
        id,
        user: { id: userId },
        translations: { languageId },
      },
      relations: { translations: true },
    });
  }

  async findReadPage(
    userId: string,
    request: PageRequest,
  ): Promise<{ items: Experience[]; total: number }> {
    const [items, total] = await this.dataSource.getRepository(Experience).findAndCount({
      where: {
        user: { id: userId },
        translations: { languageId: request.languageId },
      },
      relations: { translations: true },
      order: ORDER_BY_SORT[request.sort],
      skip: (request.page - 1) * request.limit,
      take: request.limit,
    });
    return { items, total };
  }
}
