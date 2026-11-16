import type { DataSource } from "typeorm";
import { In, Not } from "typeorm";
import ContributionRepository from "../../../../src/module/portfolio/contributions/repository/contribution.repository";
import Contribution from "../../../../src/shared/database/contribution/contribution.entity";
import ContributionTranslation from "../../../../src/shared/database/contribution/contribution_translation.entity";
import Language from "../../../../src/shared/database/language/language.entity";
import User from "../../../../src/shared/database/user/user.entity";

const CONTRIBUTION_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const USER_ID = "6c1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const LANGUAGE_ID = "language-en";

const createRepositories = () => {
  const repositories = {
    [Language.name]: { find: jest.fn().mockResolvedValue([{ id: LANGUAGE_ID }]) },
    [User.name]: { findOne: jest.fn().mockResolvedValue({ id: USER_ID }) },
    [Contribution.name]: {
      findOne: jest.fn().mockResolvedValue({ id: CONTRIBUTION_ID }),
      findAndCount: jest.fn().mockResolvedValue([[{ id: CONTRIBUTION_ID }], 1]),
      create: jest.fn((input) => input),
      save: jest.fn(async (input) => input),
      update: jest.fn(async () => ({ affected: 1 })),
      delete: jest.fn(async () => ({ affected: 1 })),
    },
    [ContributionTranslation.name]: {
      create: jest.fn((input) => input),
      save: jest.fn(async (input) => input),
      delete: jest.fn(async () => ({ affected: 2 })),
    },
  };
  const getRepository = jest.fn((entity: { name: string }) => repositories[entity.name]);
  const dataSource = { getRepository } as unknown as DataSource;

  return { repository: new ContributionRepository(dataSource), repositories };
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

test("findById loads the translations", async () => {
  const { repository, repositories } = createRepositories();

  await expect(repository.findById(CONTRIBUTION_ID)).resolves.toEqual({ id: CONTRIBUTION_ID });
  expect(repositories[Contribution.name].findOne).toHaveBeenCalledWith({
    where: { id: CONTRIBUTION_ID },
    relations: { translations: true },
  });
});

test("create saves the contribution and its translations", async () => {
  const { repository, repositories } = createRepositories();

  await repository.create({
    id: CONTRIBUTION_ID,
    userId: USER_ID,
    projectUrl: "https://github.com/user/repo",
    pullRequestUrl: null,
    translations: [{ languageId: LANGUAGE_ID, title: "Title", description: "Description" }],
  });

  const contributionRepository = repositories[Contribution.name];
  expect(contributionRepository.create).toHaveBeenCalledWith({
    id: CONTRIBUTION_ID,
    userId: USER_ID,
    projectUrl: "https://github.com/user/repo",
    pullRequestUrl: null,
  });
  expect(contributionRepository.save).toHaveBeenCalledTimes(1);
  expect(repositories[ContributionTranslation.name].save).toHaveBeenCalledWith([
    { id: CONTRIBUTION_ID, languageId: LANGUAGE_ID, title: "Title", description: "Description" },
  ]);
});

test("saveFields updates the contribution row", async () => {
  const { repository, repositories } = createRepositories();

  await repository.saveFields(CONTRIBUTION_ID, {
    projectUrl: "https://github.com/user/repo",
    pullRequestUrl: "https://github.com/user/repo/pull/1",
  });

  expect(repositories[Contribution.name].update).toHaveBeenCalledWith(
    { id: CONTRIBUTION_ID },
    {
      projectUrl: "https://github.com/user/repo",
      pullRequestUrl: "https://github.com/user/repo/pull/1",
    },
  );
});

test("saveTranslations overwrites the translations and removes the stale languages", async () => {
  const { repository, repositories } = createRepositories();

  await repository.saveTranslations(CONTRIBUTION_ID, [
    { languageId: LANGUAGE_ID, title: "Title", description: "Description" },
  ]);

  const translationRepository = repositories[ContributionTranslation.name];
  expect(translationRepository.save).toHaveBeenCalledWith([
    { id: CONTRIBUTION_ID, languageId: LANGUAGE_ID, title: "Title", description: "Description" },
  ]);
  expect(translationRepository.delete).toHaveBeenCalledWith({
    id: CONTRIBUTION_ID,
    languageId: Not(In([LANGUAGE_ID])),
  });
});

test("hardDelete deletes the contribution row", async () => {
  const { repository, repositories } = createRepositories();

  await repository.hardDelete(CONTRIBUTION_ID);

  expect(repositories[Contribution.name].delete).toHaveBeenCalledWith({ id: CONTRIBUTION_ID });
});

test("findReadOne filters by owner, contribution and language", async () => {
  const { repository, repositories } = createRepositories();

  await repository.findReadOne(USER_ID, CONTRIBUTION_ID, LANGUAGE_ID);

  expect(repositories[Contribution.name].findOne).toHaveBeenCalledWith({
    where: {
      id: CONTRIBUTION_ID,
      user: { id: USER_ID },
      translations: { languageId: LANGUAGE_ID },
    },
    relations: { translations: true },
  });
});

test("findReadPage pages the contributions of a user in one language", async () => {
  const { repository, repositories } = createRepositories();

  await expect(
    repository.findReadPage(USER_ID, {
      languageId: LANGUAGE_ID,
      limit: 20,
      page: 3,
      sort: "title_asc",
    }),
  ).resolves.toEqual({ items: [{ id: CONTRIBUTION_ID }], total: 1 });
  expect(repositories[Contribution.name].findAndCount).toHaveBeenCalledWith({
    where: { user: { id: USER_ID }, translations: { languageId: LANGUAGE_ID } },
    relations: { translations: true },
    order: { translations: { title: "ASC" }, id: "ASC" },
    skip: 40,
    take: 20,
  });
});
