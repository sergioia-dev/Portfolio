import type { DataSource, EntityManager, FindOptionsOrder, FindOptionsWhere } from "typeorm";
import { In, Not } from "typeorm";
import Article from "../../../shared/database/article/article.entity";
import ArticleTranslation from "../../../shared/database/article/article_translation.entity";
import Language from "../../../shared/database/language/language.entity";
import Tag from "../../../shared/database/tag/tag.entity";
import User from "../../../shared/database/user/user.entity";
import type { SortOption } from "../validators/article.validators";

export interface TranslationFields {
  languageId: string;
  title: string;
  description: string;
  rawMarkdown: string;
  renderedHtml: string;
  updatedAt: Date;
}

export interface NewArticle {
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

const ORDER_BY_SORT: Record<SortOption, FindOptionsOrder<Article>> = {
  updated_at_desc: { translations: { updatedAt: "DESC" }, id: "ASC" },
  updated_at_asc: { translations: { updatedAt: "ASC" }, id: "ASC" },
  title_asc: { translations: { title: "ASC" }, id: "ASC" },
};

export default class ArticleRepository {
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

  findById(id: string): Promise<Article | null> {
    return this.dataSource.getRepository(Article).findOne({
      where: { id, isDeleted: false },
      relations: { translations: true, tags: true },
    });
  }

  findOwned(id: string, userId: string): Promise<Article | null> {
    return this.dataSource.getRepository(Article).findOne({
      where: { id, user: { id: userId } },
      relations: { translations: true, tags: true },
    });
  }

  async create(input: NewArticle): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const articles = manager.getRepository(Article);
      await articles.save(articles.create({ id: input.id, userId: input.userId }));
      await this.saveTranslations(manager, input.id, input.translations);
      if (input.tagIds.length > 0) {
        await articles
          .createQueryBuilder()
          .relation(Article, "tags")
          .of(input.id)
          .add(input.tagIds);
      }
    });
  }

  async update(id: string, translations: TranslationFields[], tagIds: string[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.saveTranslations(manager, id, translations);

      const articles = manager.getRepository(Article);
      const article = await articles.findOne({ where: { id }, relations: { tags: true } });
      const existingIds = (article?.tags ?? []).map((tag) => tag.id);
      const addIds = tagIds.filter((tagId) => !existingIds.includes(tagId));
      const removeIds = existingIds.filter((tagId) => !tagIds.includes(tagId));
      if (addIds.length === 0 && removeIds.length === 0) return;
      await articles
        .createQueryBuilder()
        .relation(Article, "tags")
        .of(id)
        .addAndRemove(addIds, removeIds);
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.dataSource
      .getRepository(Article)
      .update({ id }, { isDeleted: true, deletedAt: new Date() });
  }

  findReadOne(userId: string, id: string, languageId: string): Promise<Article | null> {
    return this.dataSource.getRepository(Article).findOne({
      where: { id, isDeleted: false, user: { id: userId }, translations: { languageId } },
      relations: { translations: true, tags: true },
    });
  }

  async findReadPage(
    userId: string,
    request: PageRequest,
  ): Promise<{ items: Article[]; total: number }> {
    const where: FindOptionsWhere<Article> = {
      isDeleted: false,
      user: { id: userId },
      translations: { languageId: request.languageId },
    };
    if (request.tagId !== null) {
      where.tags = { id: request.tagId };
    }
    const [items, total] = await this.dataSource.getRepository(Article).findAndCount({
      where,
      relations: { translations: true, tags: true },
      order: ORDER_BY_SORT[request.sort],
      skip: (request.page - 1) * request.limit,
      take: request.limit,
    });
    return { items, total };
  }

  private async saveTranslations(
    manager: EntityManager,
    id: string,
    translations: TranslationFields[],
  ): Promise<void> {
    const repository = manager.getRepository(ArticleTranslation);
    await repository.save(
      translations.map((translation) => repository.create({ id, ...translation })),
    );
    await repository.delete({
      id,
      languageId: Not(In(translations.map((translation) => translation.languageId))),
    });
  }
}
