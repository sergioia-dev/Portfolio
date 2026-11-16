import type ExperienceRepository from "../../../../src/module/portfolio/experiences/repository/experience.repository";
import ExperienceService from "../../../../src/module/portfolio/experiences/service/experience.service";

const LANGUAGE_EN = { id: "language-en", name: "EN" };
const LANGUAGE_ES = { id: "language-es", name: "ES" };
const EXPERIENCE_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const USER_ID = "6c1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";

const body = () => ({
  website_url: "https://example.com",
  start_date: "2020-01-01",
  end_date: null,
  translations: [
    { language: "en", title: "Developer", description: "Built things" },
    { language: "es", title: "Desarrollador", description: "Construyó cosas" },
  ],
});

const experience = (overrides: Record<string, unknown> = {}) => ({
  id: EXPERIENCE_ID,
  userId: USER_ID,
  websiteUrl: "https://example.com",
  startDate: "2020-01-01",
  endDate: null,
  translations: [
    {
      id: EXPERIENCE_ID,
      languageId: "language-en",
      title: "Developer",
      description: "Built things",
    },
    {
      id: EXPERIENCE_ID,
      languageId: "language-es",
      title: "Desarrollador",
      description: "Construyó cosas",
    },
  ],
  ...overrides,
});

const createRepository = () => ({
  findLanguages: jest.fn().mockResolvedValue([LANGUAGE_EN, LANGUAGE_ES]),
  findUser: jest.fn().mockResolvedValue({ id: USER_ID, deletedAt: null }),
  findById: jest.fn().mockResolvedValue(experience()),
  create: jest.fn().mockResolvedValue(experience()),
  saveFields: jest.fn().mockResolvedValue(undefined),
  saveTranslations: jest.fn().mockResolvedValue(undefined),
  hardDelete: jest.fn().mockResolvedValue(undefined),
  findReadOne: jest.fn().mockResolvedValue(experience()),
  findReadPage: jest.fn().mockResolvedValue({ items: [experience()], total: 1 }),
});

const buildService = () => {
  const repository = createRepository();
  return {
    service: new ExperienceService(repository as unknown as ExperienceRepository),
    repository,
  };
};

test("create stores the experience and its translations", async () => {
  const { service, repository } = buildService();

  await expect(service.create(USER_ID, body())).resolves.toEqual({ id: expect.any(String) });
  expect(repository.create).toHaveBeenCalledWith({
    id: expect.any(String),
    userId: USER_ID,
    websiteUrl: "https://example.com",
    startDate: "2020-01-01",
    endDate: null,
    translations: [
      { languageId: "language-en", title: "Developer", description: "Built things" },
      { languageId: "language-es", title: "Desarrollador", description: "Construyó cosas" },
    ],
  });
});

test("create rejects an invalid body without writing", async () => {
  const { service, repository } = buildService();

  await expect(service.create(USER_ID, { start_date: "2020-01-01" })).rejects.toMatchObject({
    code: "MSG-8",
  });
  expect(repository.create).not.toHaveBeenCalled();
});

test("update replaces the fields and every translation", async () => {
  const { service, repository } = buildService();

  await expect(service.update(USER_ID, EXPERIENCE_ID, body())).resolves.toEqual({
    id: EXPERIENCE_ID,
  });
  expect(repository.saveFields).toHaveBeenCalledWith(EXPERIENCE_ID, {
    websiteUrl: "https://example.com",
    startDate: "2020-01-01",
    endDate: null,
  });
  expect(repository.saveTranslations).toHaveBeenCalledWith(EXPERIENCE_ID, [
    { languageId: "language-en", title: "Developer", description: "Built things" },
    { languageId: "language-es", title: "Desarrollador", description: "Construyó cosas" },
  ]);
});

test("update rejects a malformed id", async () => {
  const { service, repository } = buildService();

  await expect(service.update(USER_ID, "not-an-id", body())).rejects.toMatchObject({
    code: "INVALID_ID",
  });
  expect(repository.findById).not.toHaveBeenCalled();
});

test("update reports MSG-10 for a missing or foreign experience", async () => {
  for (const existing of [null, experience({ userId: "another-user" })]) {
    const { service, repository } = buildService();
    repository.findById.mockResolvedValue(existing);

    await expect(service.update(USER_ID, EXPERIENCE_ID, body())).rejects.toMatchObject({
      code: "MSG-10",
    });
    expect(repository.saveFields).not.toHaveBeenCalled();
  }
});

test("update validates the body before writing", async () => {
  const { service, repository } = buildService();

  await expect(service.update(USER_ID, EXPERIENCE_ID, {})).rejects.toMatchObject({
    code: "MSG-8",
  });
  expect(repository.saveTranslations).not.toHaveBeenCalled();
});

test("remove hard deletes the experience", async () => {
  const { service, repository } = buildService();

  await expect(service.remove(USER_ID, EXPERIENCE_ID)).resolves.toBeUndefined();
  expect(repository.hardDelete).toHaveBeenCalledWith(EXPERIENCE_ID);
});

test("remove reports MSG-10 for a missing or foreign experience", async () => {
  const { service, repository } = buildService();

  for (const existing of [null, experience({ userId: "another-user" })]) {
    repository.findById.mockResolvedValue(existing);

    await expect(service.remove(USER_ID, EXPERIENCE_ID)).rejects.toMatchObject({
      code: "MSG-10",
    });
  }
  expect(repository.hardDelete).not.toHaveBeenCalled();
});

test("list returns the page and its metadata", async () => {
  const { service, repository } = buildService();

  await expect(service.list(USER_ID, { language: "en" })).resolves.toEqual({
    items: [
      {
        id: EXPERIENCE_ID,
        website_url: "https://example.com",
        start_date: "2020-01-01",
        end_date: null,
        translation: { language: "EN", title: "Developer", description: "Built things" },
      },
    ],
    meta: {
      userId: USER_ID,
      language: "EN",
      page: 1,
      limit: 20,
      total: 1,
      total_pages: 1,
    },
  });
  expect(repository.findReadPage).toHaveBeenCalledWith(USER_ID, {
    languageId: "language-en",
    limit: 20,
    page: 1,
    sort: "start_date_desc",
  });
});

test("list rounds total_pages up", async () => {
  const { service, repository } = buildService();
  repository.findReadPage.mockResolvedValue({ items: [], total: 21 });

  await expect(
    service.list(USER_ID, { language: "en", limit: "10", page: "2" }),
  ).resolves.toMatchObject({ meta: { total_pages: 3, limit: 10, page: 2 } });
});

test("list reports MSG-4 for an unknown or deleted user", async () => {
  for (const user of [null, { id: USER_ID, deletedAt: new Date() }]) {
    const { service, repository } = buildService();
    repository.findUser.mockResolvedValue(user);

    await expect(service.list(USER_ID, { language: "en" })).rejects.toMatchObject({
      code: "MSG-4",
    });
    expect(repository.findReadPage).not.toHaveBeenCalled();
  }
});

test("list validates the user id and the query", async () => {
  const { service } = buildService();

  await expect(service.list("not-an-id", { language: "en" })).rejects.toMatchObject({
    code: "INVALID_ID",
  });
  await expect(service.list(USER_ID, { language: "en", limit: "0" })).rejects.toMatchObject({
    code: "INVALID_QUERY_PARAM",
  });
});

test("get returns one experience in the requested language", async () => {
  const { service, repository } = buildService();

  await expect(service.get(USER_ID, EXPERIENCE_ID, { language: "es" })).resolves.toEqual({
    id: EXPERIENCE_ID,
    website_url: "https://example.com",
    start_date: "2020-01-01",
    end_date: null,
    translation: { language: "ES", title: "Desarrollador", description: "Construyó cosas" },
  });
  expect(repository.findReadOne).toHaveBeenCalledWith(USER_ID, EXPERIENCE_ID, "language-es");
});

test("get reports MSG-10 when the translation is missing", async () => {
  const { service, repository } = buildService();
  repository.findReadOne.mockResolvedValue(null);

  await expect(service.get(USER_ID, EXPERIENCE_ID, { language: "en" })).rejects.toMatchObject({
    code: "MSG-10",
  });
});

test("get validates ids, the user and the query", async () => {
  const { service, repository } = buildService();

  await expect(service.get("not-an-id", EXPERIENCE_ID, { language: "en" })).rejects.toMatchObject({
    code: "INVALID_ID",
  });
  await expect(service.get(USER_ID, "not-an-id", { language: "en" })).rejects.toMatchObject({
    code: "INVALID_ID",
  });

  repository.findUser.mockResolvedValue(null);
  await expect(service.get(USER_ID, EXPERIENCE_ID, { language: "en" })).rejects.toMatchObject({
    code: "MSG-4",
  });

  repository.findUser.mockResolvedValue({ id: USER_ID, deletedAt: null });
  repository.findById.mockResolvedValue(experience({ userId: "another-user" }));
  await expect(service.get(USER_ID, EXPERIENCE_ID, { language: "en" })).rejects.toMatchObject({
    code: "MSG-10",
  });

  repository.findById.mockResolvedValue(experience());
  await expect(service.get(USER_ID, EXPERIENCE_ID, { language: "fr" })).rejects.toMatchObject({
    code: "MSG-6",
  });
  await expect(service.get(USER_ID, EXPERIENCE_ID, {})).rejects.toMatchObject({
    code: "MISSING_FIELD",
  });
});
