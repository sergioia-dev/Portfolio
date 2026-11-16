import type { DataSource } from "typeorm";
import { In, Not } from "typeorm";
import ProjectRepository from "../../../../src/module/portfolio/projects/repository/project.repository";
import Language from "../../../../src/shared/database/language/language.entity";
import Project from "../../../../src/shared/database/project/project.entity";
import ProjectTranslation from "../../../../src/shared/database/project/project_translation.entity";
import Tag from "../../../../src/shared/database/tag/tag.entity";
import User from "../../../../src/shared/database/user/user.entity";

const PROJECT_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const USER_ID = "6c1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const TAG_ID = "9a1e3b1e-3a1e-4a1e-9a1e-2f1c9f2e0c3b";
const LANGUAGE_ID = "language-en";

const createRepositories = () => {
  const addAndRemove = jest.fn();
  const queryBuilder = {
    relation: jest.fn().mockReturnValue({ of: jest.fn().mockReturnValue({ addAndRemove }) }),
  };
  const repositories = {
    [Language.name]: { find: jest.fn().mockResolvedValue([{ id: LANGUAGE_ID }]) },
    [User.name]: { findOne: jest.fn().mockResolvedValue({ id: USER_ID }) },
    [Tag.name]: { find: jest.fn().mockResolvedValue([{ id: TAG_ID, name: "TypeScript" }]) },
    [Project.name]: {
      findOne: jest.fn().mockResolvedValue({ id: PROJECT_ID }),
      findAndCount: jest.fn().mockResolvedValue([[{ id: PROJECT_ID }], 1]),
      create: jest.fn((input) => input),
      save: jest.fn(async (input) => input),
      update: jest.fn(async () => ({ affected: 1 })),
      delete: jest.fn(async () => ({ affected: 1 })),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    },
    [ProjectTranslation.name]: {
      create: jest.fn((input) => input),
      save: jest.fn(async (input) => input),
      delete: jest.fn(async () => ({ affected: 2 })),
    },
  };
  const getRepository = jest.fn((entity: { name: string }) => repositories[entity.name]);
  const dataSource = { getRepository } as unknown as DataSource;

  return {
    repository: new ProjectRepository(dataSource),
    repositories,
    queryBuilder,
    addAndRemove,
  };
};

test("findLanguages reads the language catalog", async () => {
  const { repository, repositories } = createRepositories();

  await expect(repository.findLanguages()).resolves.toEqual([{ id: LANGUAGE_ID }]);
  expect(repositories[Language.name].find).toHaveBeenCalledWith();
});

test("findUser returns the user or null", async () => {
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

test("findById loads the translations and the tags", async () => {
  const { repository, repositories } = createRepositories();

  await expect(repository.findById(PROJECT_ID)).resolves.toEqual({ id: PROJECT_ID });
  expect(repositories[Project.name].findOne).toHaveBeenCalledWith({
    where: { id: PROJECT_ID },
    relations: { translations: true, tags: true },
  });
});

test("create saves the project, its translations and its tags", async () => {
  const { repository, repositories, addAndRemove } = createRepositories();

  await repository.create({
    id: PROJECT_ID,
    userId: USER_ID,
    repositoryUrl: "https://github.com/user/repo",
    websiteUrl: null,
    tagIds: [TAG_ID],
    translations: [{ languageId: LANGUAGE_ID, title: "Title", description: "Description" }],
  });

  const projectRepository = repositories[Project.name];
  expect(projectRepository.create).toHaveBeenCalledWith({
    id: PROJECT_ID,
    userId: USER_ID,
    repositoryUrl: "https://github.com/user/repo",
    websiteUrl: null,
  });
  expect(projectRepository.save).toHaveBeenCalledTimes(1);
  expect(repositories[ProjectTranslation.name].save).toHaveBeenCalledWith([
    { id: PROJECT_ID, languageId: LANGUAGE_ID, title: "Title", description: "Description" },
  ]);
  expect(addAndRemove).toHaveBeenCalledWith([TAG_ID], []);
});

test("create stores no tags when the list is empty", async () => {
  const { repository, addAndRemove } = createRepositories();

  await repository.create({
    id: PROJECT_ID,
    userId: USER_ID,
    repositoryUrl: "https://github.com/user/repo",
    websiteUrl: null,
    tagIds: [],
    translations: [{ languageId: LANGUAGE_ID, title: "Title", description: "Description" }],
  });

  expect(addAndRemove).not.toHaveBeenCalled();
});

test("saveFields updates the project row", async () => {
  const { repository, repositories } = createRepositories();

  await repository.saveFields(PROJECT_ID, {
    repositoryUrl: "https://github.com/user/repo",
    websiteUrl: "https://example.com",
  });

  expect(repositories[Project.name].update).toHaveBeenCalledWith(
    { id: PROJECT_ID },
    { repositoryUrl: "https://github.com/user/repo", websiteUrl: "https://example.com" },
  );
});

test("saveTranslations overwrites the translations and removes the stale languages", async () => {
  const { repository, repositories } = createRepositories();

  await repository.saveTranslations(PROJECT_ID, [
    { languageId: LANGUAGE_ID, title: "Title", description: "Description" },
  ]);

  const translationRepository = repositories[ProjectTranslation.name];
  expect(translationRepository.save).toHaveBeenCalledWith([
    { id: PROJECT_ID, languageId: LANGUAGE_ID, title: "Title", description: "Description" },
  ]);
  expect(translationRepository.delete).toHaveBeenCalledWith({
    id: PROJECT_ID,
    languageId: Not(In([LANGUAGE_ID])),
  });
});

test("saveTags replaces the join rows", async () => {
  const { repository, repositories, queryBuilder, addAndRemove } = createRepositories();
  (repositories[Project.name] as { findOne: jest.Mock }).findOne.mockResolvedValue({
    id: PROJECT_ID,
    tags: [{ id: "b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1" }],
  });

  await repository.saveTags(PROJECT_ID, [TAG_ID]);

  expect(queryBuilder.relation).toHaveBeenCalledWith(Project, "tags");
  expect(addAndRemove).toHaveBeenCalledWith([TAG_ID], ["b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1"]);
});

test("hardDelete deletes the project row", async () => {
  const { repository, repositories } = createRepositories();

  await repository.hardDelete(PROJECT_ID);

  expect(repositories[Project.name].delete).toHaveBeenCalledWith({ id: PROJECT_ID });
});

test("findReadOne filters by owner, project and language", async () => {
  const { repository, repositories } = createRepositories();

  await repository.findReadOne(USER_ID, PROJECT_ID, LANGUAGE_ID);

  expect(repositories[Project.name].findOne).toHaveBeenCalledWith({
    where: { id: PROJECT_ID, user: { id: USER_ID }, translations: { languageId: LANGUAGE_ID } },
    relations: { translations: true, tags: true },
  });
});

test("findReadPage pages the projects of a user in one language", async () => {
  const { repository, repositories } = createRepositories();

  await expect(
    repository.findReadPage(USER_ID, {
      languageId: LANGUAGE_ID,
      tagId: null,
      limit: 20,
      page: 3,
      sort: "title_asc",
    }),
  ).resolves.toEqual({ items: [{ id: PROJECT_ID }], total: 1 });
  expect(repositories[Project.name].findAndCount).toHaveBeenCalledWith({
    where: { user: { id: USER_ID }, translations: { languageId: LANGUAGE_ID } },
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
    sort: "title_asc",
  });

  expect(repositories[Project.name].findAndCount).toHaveBeenCalledWith({
    where: {
      user: { id: USER_ID },
      translations: { languageId: LANGUAGE_ID },
      tags: { id: TAG_ID },
    },
    relations: { translations: true, tags: true },
    order: { translations: { title: "ASC" }, id: "ASC" },
    skip: 0,
    take: 10,
  });
});

test("findReadPage sorts by the matched title", async () => {
  const { repository, repositories } = createRepositories();

  await repository.findReadPage(USER_ID, {
    languageId: LANGUAGE_ID,
    tagId: null,
    limit: 20,
    page: 1,
    sort: "title_asc",
  });

  expect(repositories[Project.name].findAndCount).toHaveBeenCalledWith(
    expect.objectContaining({
      order: { translations: { title: "ASC" }, id: "ASC" },
    }),
  );
});
