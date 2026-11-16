import type { DataSource, FindOptionsOrder, FindOptionsWhere } from "typeorm";
import { In, Not } from "typeorm";
import Contribution from "../../../../shared/database/contribution/contribution.entity";
import ContributionTranslation from "../../../../shared/database/contribution/contribution_translation.entity";
import Language from "../../../../shared/database/language/language.entity";
import User from "../../../../shared/database/user/user.entity";
import type { SortOption } from "../validators/contribution.validators";

export interface ContributionFields {
  projectUrl: string | null;
  pullRequestUrl: string | null;
}

export interface TranslationFields {
  languageId: string;
  title: string;
  description: string;
}

export interface NewContribution extends ContributionFields {
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

const ORDER_BY_SORT: Record<SortOption, FindOptionsOrder<Contribution>> = {
  title_asc: { translations: { title: "ASC" }, id: "ASC" },
};

export default class ContributionRepository {
  constructor(private readonly dataSource: DataSource) {}

  findLanguages(): Promise<Language[]> {
    return this.dataSource.getRepository(Language).find();
  }

  findUser(id: string): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({ where: { id } });
  }

  findById(id: string): Promise<Contribution | null> {
    return this.dataSource.getRepository(Contribution).findOne({
      where: { id },
      relations: { translations: true },
    });
  }

  async create(input: NewContribution): Promise<void> {
    const repository = this.dataSource.getRepository(Contribution);
    await repository.save(
      repository.create({
        id: input.id,
        userId: input.userId,
        projectUrl: input.projectUrl,
        pullRequestUrl: input.pullRequestUrl,
      }),
    );
    await this.saveTranslations(input.id, input.translations);
  }

  async saveFields(id: string, fields: ContributionFields): Promise<void> {
    await this.dataSource.getRepository(Contribution).update({ id }, fields);
  }

  async saveTranslations(id: string, translations: TranslationFields[]): Promise<void> {
    const repository = this.dataSource.getRepository(ContributionTranslation);
    await repository.save(
      translations.map((translation) => repository.create({ id, ...translation })),
    );
    await repository.delete({
      id,
      languageId: Not(In(translations.map((translation) => translation.languageId))),
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.dataSource.getRepository(Contribution).delete({ id });
  }

  findReadOne(userId: string, id: string, languageId: string): Promise<Contribution | null> {
    return this.dataSource.getRepository(Contribution).findOne({
      where: { id, user: { id: userId }, translations: { languageId } },
      relations: { translations: true },
    });
  }

  async findReadPage(
    userId: string,
    request: PageRequest,
  ): Promise<{ items: Contribution[]; total: number }> {
    const where: FindOptionsWhere<Contribution> = {
      user: { id: userId },
      translations: { languageId: request.languageId },
    };
    const [items, total] = await this.dataSource.getRepository(Contribution).findAndCount({
      where,
      relations: { translations: true },
      order: ORDER_BY_SORT[request.sort],
      skip: (request.page - 1) * request.limit,
      take: request.limit,
    });
    return { items, total };
  }
}
