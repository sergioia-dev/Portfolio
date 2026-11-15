import type { DataSource } from "typeorm";
import { In, Not } from "typeorm";
import ExperienceRepository from "../../../../src/module/portfolio/experiences/repository/experience.repository";
import Experience from "../../../../src/shared/database/experience/experience.entity";
import ExperienceTranslation from "../../../../src/shared/database/experience/experience_translation.entity";
import Language from "../../../../src/shared/database/language/language.entity";
import User from "../../../../src/shared/database/user/user.entity";

const EXPERIENCE_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const USER_ID = "6c1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const LANGUAGE_ID = "language-id";

const createRepositories = () => {
  const experience = {
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn((input: unknown) => input),
    save: jest.fn(async (input: unknown) => input),
    update: jest.fn(async () => ({ affected: 1 })),
  };
  const translation = {
    create: jest.fn((input: unknown) => input),
    save: jest.fn(async (input: unknown) => input),
    delete: jest.fn(async () => ({ affected: 1 })),
    update: jest.fn(async () => ({ affected: 1 })),
  };
  const language = { find: jest.fn() };
  const user = { findOne: jest.fn() };

  const repositories: Record<string, unknown> = {
    [Experience.name]: experience,
    [ExperienceTranslation.name]: translation,
    [Language.name]: language,
    [User.name]: user,
  };
  const getRepository = jest.fn((entity: { name: string }) => repositories[entity.name]);
  const dataSource = { getRepository } as unknown as DataSource;

  return {
    repository: new ExperienceRepository(dataSource),
    experience,
    translation,
    language,
    user,
    getRepository,
  };
};

test("findLanguages lists every language", async () => {
  const { repository, language, getRepository } = createRepositories();
  language.find.mockResolvedValue([{ id: LANGUAGE_ID }]);

  await expect(repository.findLanguages()).resolves.toEqual([{ id: LANGUAGE_ID }]);
  expect(getRepository).toHaveBeenCalledWith(Language);
  expect(language.find).toHaveBeenCalledWith();
});

test("findUser looks a user up by id", async () => {
  const { repository, user, getRepository } = createRepositories();
  user.findOne.mockResolvedValue({ id: USER_ID });

  await expect(repository.findUser(USER_ID)).resolves.toEqual({ id: USER_ID });
  expect(getRepository).toHaveBeenCalledWith(User);
  expect(user.findOne).toHaveBeenCalledWith({ where: { id: USER_ID } });
});

test("findById loads the experience with its translations", async () => {
  const { repository, experience } = createRepositories();
  experience.findOne.mockResolvedValue({ id: EXPERIENCE_ID });

  await expect(repository.findById(EXPERIENCE_ID)).resolves.toEqual({ id: EXPERIENCE_ID });
  expect(experience.findOne).toHaveBeenCalledWith({
    where: { id: EXPERIENCE_ID },
    relations: { translations: true },
  });
});

test("create saves the experience and then its translations", async () => {
  const { repository, experience, translation } = createRepositories();

  await repository.create({
    id: EXPERIENCE_ID,
    userId: USER_ID,
    websiteUrl: null,
    startDate: "2020-01-01",
    endDate: null,
    translations: [{ languageId: LANGUAGE_ID, title: "Developer", description: "Built things" }],
  });

  expect(experience.create).toHaveBeenCalledWith({
    id: EXPERIENCE_ID,
    userId: USER_ID,
    websiteUrl: null,
    startDate: "2020-01-01",
    endDate: null,
  });
  expect(translation.save).toHaveBeenCalledWith([
    {
      id: EXPERIENCE_ID,
      languageId: LANGUAGE_ID,
      title: "Developer",
      description: "Built things",
      deletedAt: null,
    },
  ]);
  expect(translation.delete).toHaveBeenCalledWith({
    id: EXPERIENCE_ID,
    languageId: Not(In([LANGUAGE_ID])),
  });
});

test("saveFields updates the experience row", async () => {
  const { repository, experience } = createRepositories();

  await repository.saveFields(EXPERIENCE_ID, {
    websiteUrl: null,
    startDate: "2020-01-01",
    endDate: null,
  });

  expect(experience.update).toHaveBeenCalledWith(
    { id: EXPERIENCE_ID },
    { websiteUrl: null, startDate: "2020-01-01", endDate: null },
  );
});

test("saveTranslations drops the languages that were removed", async () => {
  const { repository, translation } = createRepositories();

  await repository.saveTranslations(EXPERIENCE_ID, [
    { languageId: "language-en", title: "Developer", description: "Built things" },
    { languageId: "language-es", title: "Desarrollador", description: "Construyó cosas" },
  ]);

  expect(translation.save).toHaveBeenCalledWith([
    {
      id: EXPERIENCE_ID,
      languageId: "language-en",
      title: "Developer",
      description: "Built things",
      deletedAt: null,
    },
    {
      id: EXPERIENCE_ID,
      languageId: "language-es",
      title: "Desarrollador",
      description: "Construyó cosas",
      deletedAt: null,
    },
  ]);
  expect(translation.delete).toHaveBeenCalledWith({
    id: EXPERIENCE_ID,
    languageId: Not(In(["language-en", "language-es"])),
  });
});

test("softDelete marks the experience and its translations", async () => {
  const { repository, experience, translation } = createRepositories();
  const deletedAt = new Date("2024-01-01T00:00:00Z");

  await repository.softDelete(EXPERIENCE_ID, deletedAt);

  expect(experience.update).toHaveBeenCalledWith({ id: EXPERIENCE_ID }, { deletedAt });
  expect(translation.update).toHaveBeenCalledWith({ id: EXPERIENCE_ID }, { deletedAt });
});

test("findReadOne filters by user, language and soft deletion", async () => {
  const { repository, experience } = createRepositories();
  experience.findOne.mockResolvedValue({ id: EXPERIENCE_ID });

  await expect(repository.findReadOne(USER_ID, EXPERIENCE_ID, LANGUAGE_ID)).resolves.toEqual({
    id: EXPERIENCE_ID,
  });
  expect(experience.findOne).toHaveBeenCalledWith({
    where: {
      id: EXPERIENCE_ID,
      deletedAt: expect.anything(),
      user: { id: USER_ID },
      translations: { languageId: LANGUAGE_ID, deletedAt: expect.anything() },
    },
    relations: { translations: true },
  });
});

test("findReadPage paginates and sorts the results", async () => {
  const { repository, experience } = createRepositories();
  experience.findAndCount.mockResolvedValue([[{ id: EXPERIENCE_ID }], 7]);

  await expect(
    repository.findReadPage(USER_ID, {
      languageId: LANGUAGE_ID,
      limit: 20,
      page: 3,
      sort: "start_date_desc",
    }),
  ).resolves.toEqual({ items: [{ id: EXPERIENCE_ID }], total: 7 });

  expect(experience.findAndCount).toHaveBeenCalledWith({
    where: {
      deletedAt: expect.anything(),
      user: { id: USER_ID },
      translations: { languageId: LANGUAGE_ID, deletedAt: expect.anything() },
    },
    relations: { translations: true },
    order: { startDate: "DESC", id: "DESC" },
    skip: 40,
    take: 20,
  });
});

test("findReadPage maps every sort option to its order", async () => {
  const orders: Record<string, unknown> = {
    start_date_desc: { startDate: "DESC", id: "DESC" },
    start_date_asc: { startDate: "ASC", id: "ASC" },
    created_at_desc: { createdAt: "DESC", id: "DESC" },
  };

  for (const [sort, order] of Object.entries(orders)) {
    const { repository, experience } = createRepositories();
    experience.findAndCount.mockResolvedValue([[], 0]);

    await repository.findReadPage(USER_ID, {
      languageId: LANGUAGE_ID,
      limit: 1,
      page: 1,
      sort: sort as "start_date_desc",
    });

    expect(experience.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ order, skip: 0 }),
    );
  }
});
