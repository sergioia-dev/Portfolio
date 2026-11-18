import type { DataSource } from "typeorm";
import { In, Not } from "typeorm";
import ArticleRepository from "../../../src/module/articles/repository/article.repository";
import Article from "../../../src/shared/database/article/article.entity";
import ArticleTranslation from "../../../src/shared/database/article/article_translation.entity";
import Language from "../../../src/shared/database/language/language.entity";
import Tag from "../../../src/shared/database/tag/tag.entity";
import User from "../../../src/shared/database/user/user.entity";

const ARTICLE_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const USER_ID = "6c1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const TAG_ID = "9a1e3b1e-3a1e-4a1e-9a1e-2f1c9f2e0c3b";
const OTHER_TAG_ID = "b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1";
const LANGUAGE_ID = "language-en";
const UPDATED_AT = new Date("2025-01-01T00:00:00.000Z");

const translation = () => ({
  languageId: LANGUAGE_ID,
  title: "Title",
  description: "Description",
  rawMarkdown: "# Hi",
  renderedHtml: "<h1>Hi</h1>",
  updatedAt: UPDATED_AT,
});

const createRepositories = () => {
  const add = jest.fn();
  const addAndRemove = jest.fn();
  const queryBuilder = {
    relation: jest.fn().mockReturnValue({
      of: jest.fn().mockReturnValue({ add, addAndRemove }),
    }),
  };
  const repositories = {
    [Language.name]: {
      find: jest.fn().mockResolvedValue([{ id: LANGUAGE_ID, name: "EN" }]),
    },
    [User.name]: { findOne: jest.fn().mockResolvedValue({ id: USER_ID }) },
    [Tag.name]: { find: jest.fn().mockResolvedValue([{ id: TAG_ID, name: "TypeScript" }]) },
    [Article.name]: {
      findOne: jest.fn().mockResolvedValue({ id: ARTICLE_ID }),
      findAndCount: jest.fn().mockResolvedValue([[{ id: ARTICLE_ID }], 1]),
      create: jest.fn((input) => input),
      save: jest.fn(async (input) => input),
      update: jest.fn(async () => ({ affected: 1 })),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    },
    [ArticleTranslation.name]: {
      create: jest.fn((input) => input),
      save: jest.fn(async (input) => input),
      delete: jest.fn(async () => ({ affected: 0 })),
    },
  };
  const getRepository = jest.fn((entity: { name: string }) => repositories[entity.name]);
  const dataSource = {
    getRepository,
    transaction: jest.fn(async (run: (manager: unknown) => unknown) => run({ getRepository })),
  } as unknown as DataSource;

  return {
    repository: new ArticleRepository(dataSource),
    repositories,
    queryBuilder,
    add,
    addAndRemove,
  };
};

test("findLanguages reads the language catalog", async () => {
  const { repository, repositories } = createRepositories();

  await expect(repository.findLanguages()).resolves.toEqual([{ id: LANGUAGE_ID, name: "EN" }]);
  expect(repositories[Language.name].find).toHaveBeenCalledWith();
});

test("findUser returns the user", async () => {
  const { repository, repositories } = createRepositories();

  await expect(repository.findUser(USER_ID)).resolves.toEqual({ id: USER_ID });
  expect(repositories[User.name].findOne).toHaveBeenCalledWith({ where: { id: USER_ID } });
});

test("findTags only reads the tags owned by the user", async () => {
  const { repository, repositories } = createRepositories();

  await repository.findTags(USER_ID, [TAG_ID]);

  expect(repositories[Tag.name].find).toHaveBeenCalledWith({
    where: { id: In([TAG_ID]), userId: USER_ID },
  });
});

test("findById only loads active articles with translations and tags", async () => {
  const { repository, repositories } = createRepositories();

  await repository.findById(ARTICLE_ID);

  expect(repositories[Article.name].findOne).toHaveBeenCalledWith({
    where: { id: ARTICLE_ID, isDeleted: false },
    relations: { translations: true, tags: true },
  });
});

test("findOwned loads soft deleted articles too", async () => {
  const { repository, repositories } = createRepositories();

  await repository.findOwned(ARTICLE_ID, USER_ID);

  expect(repositories[Article.name].findOne).toHaveBeenCalledWith({
    where: { id: ARTICLE_ID, user: { id: USER_ID } },
    relations: { translations: true, tags: true },
  });
});

test("create saves the article, its translations and its tags", async () => {
  const { repository, repositories, add } = createRepositories();

  await repository.create({
    id: ARTICLE_ID,
    userId: USER_ID,
    tagIds: [TAG_ID],
    translations: [translation()],
  });

  const articleRepository = repositories[Article.name];
  expect(articleRepository.create).toHaveBeenCalledWith({ id: ARTICLE_ID, userId: USER_ID });
  expect(articleRepository.save).toHaveBeenCalledTimes(1);
  expect(repositories[ArticleTranslation.name].save).toHaveBeenCalledWith([
    { id: ARTICLE_ID, ...translation() },
  ]);
  expect(repositories[ArticleTranslation.name].delete).toHaveBeenCalledWith({
    id: ARTICLE_ID,
    languageId: Not(In([LANGUAGE_ID])),
  });
  expect(add).toHaveBeenCalledWith([TAG_ID]);
});

test("create stores no tags when the list is empty", async () => {
  const { repository, queryBuilder, add } = createRepositories();

  await repository.create({
    id: ARTICLE_ID,
    userId: USER_ID,
    tagIds: [],
    translations: [translation()],
  });

  expect(queryBuilder.relation).not.toHaveBeenCalled();
  expect(add).not.toHaveBeenCalled();
});

test("update replaces the translations and diffs the tags", async () => {
  const { repository, repositories, queryBuilder, addAndRemove } = createRepositories();
  (repositories[Article.name] as { findOne: jest.Mock }).findOne.mockResolvedValue({
    id: ARTICLE_ID,
    tags: [{ id: OTHER_TAG_ID }],
  });

  await repository.update(ARTICLE_ID, [translation()], [TAG_ID]);

  expect(repositories[ArticleTranslation.name].save).toHaveBeenCalledWith([
    { id: ARTICLE_ID, ...translation() },
  ]);
  expect(queryBuilder.relation).toHaveBeenCalledWith(Article, "tags");
  expect(addAndRemove).toHaveBeenCalledWith([TAG_ID], [OTHER_TAG_ID]);
});

test("update skips the tag relation when nothing changed", async () => {
  const { repository, repositories, queryBuilder, addAndRemove } = createRepositories();
  (repositories[Article.name] as { findOne: jest.Mock }).findOne.mockResolvedValue({
    id: ARTICLE_ID,
    tags: [{ id: TAG_ID }],
  });

  await repository.update(ARTICLE_ID, [translation()], [TAG_ID]);

  expect(queryBuilder.relation).not.toHaveBeenCalled();
  expect(addAndRemove).not.toHaveBeenCalled();
});

test("softDelete flips the deletion flags", async () => {
  const { repository, repositories } = createRepositories();

  await repository.softDelete(ARTICLE_ID);

  expect(repositories[Article.name].update).toHaveBeenCalledWith(
    { id: ARTICLE_ID },
    { isDeleted: true, deletedAt: expect.any(Date) },
  );
});

test("findReadOne filters by owner, article, language and active state", async () => {
  const { repository, repositories } = createRepositories();

  await repository.findReadOne(USER_ID, ARTICLE_ID, LANGUAGE_ID);

  expect(repositories[Article.name].findOne).toHaveBeenCalledWith({
    where: {
      id: ARTICLE_ID,
      isDeleted: false,
      user: { id: USER_ID },
      translations: { languageId: LANGUAGE_ID },
    },
    relations: { translations: true, tags: true },
  });
});

test("findReadPage pages the active articles of a user in one language", async () => {
  const { repository, repositories } = createRepositories();

  await expect(
    repository.findReadPage(USER_ID, {
      languageId: LANGUAGE_ID,
      tagId: null,
      limit: 20,
      page: 3,
      sort: "title_asc",
    }),
  ).resolves.toEqual({ items: [{ id: ARTICLE_ID }], total: 1 });
  expect(repositories[Article.name].findAndCount).toHaveBeenCalledWith({
    where: {
      isDeleted: false,
      user: { id: USER_ID },
      translations: { languageId: LANGUAGE_ID },
    },
    relations: { translations: true, tags: true },
    order: { translations: { title: "ASC" }, id: "ASC" },
    skip: 40,
    take: 20,
  });
});

test("findReadPage applies the tag filter", async () => {
  const { repository, repositories } = createRepositories();

  await repository.findReadPage(USER_ID, {
    languageId: LANGUAGE_ID,
    tagId: TAG_ID,
    limit: 10,
    page: 1,
    sort: "updated_at_desc",
  });

  expect(repositories[Article.name].findAndCount).toHaveBeenCalledWith({
    where: {
      isDeleted: false,
      user: { id: USER_ID },
      translations: { languageId: LANGUAGE_ID },
      tags: { id: TAG_ID },
    },
    relations: { translations: true, tags: true },
    order: { translations: { updatedAt: "DESC" }, id: "ASC" },
    skip: 0,
    take: 10,
  });
});

test("findReadPage supports ascending update order", async () => {
  const { repository, repositories } = createRepositories();

  await repository.findReadPage(USER_ID, {
    languageId: LANGUAGE_ID,
    tagId: null,
    limit: 20,
    page: 1,
    sort: "updated_at_asc",
  });

  expect(repositories[Article.name].findAndCount).toHaveBeenCalledWith(
    expect.objectContaining({
      order: { translations: { updatedAt: "ASC" }, id: "ASC" },
    }),
  );
});
