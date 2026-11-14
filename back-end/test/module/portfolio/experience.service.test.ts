import type ExperienceRepository from "../../../src/module/portfolio/experience.repository";
import ExperienceService from "../../../src/module/portfolio/experience.service";

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
  deletedAt: null,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-02-01T00:00:00Z"),
  translations: [
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
  softDelete: jest.fn().mockResolvedValue(undefined),
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

test("update reports MSG-10 for a missing, deleted or foreign experience", async () => {
  for (const existing of [
    null,
    experience({ deletedAt: new Date() }),
    experience({ userId: "another-user" }),
  ]) {
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

test("remove soft deletes the experience with a timestamp", async () => {
  const { service, repository } = buildService();

  await expect(service.remove(USER_ID, EXPERIENCE_ID, null)).resolves.toBeUndefined();
  expect(repository.softDelete).toHaveBeenCalledWith(EXPERIENCE_ID, expect.any(Date));
});

test("remove is idempotent for an already deleted experience", async () => {
  const { service, repository } = buildService();
  repository.findById.mockResolvedValue(experience({ deletedAt: new Date() }));

  await expect(service.remove(USER_ID, EXPERIENCE_ID, null)).resolves.toBeUndefined();
  expect(repository.softDelete).not.toHaveBeenCalled();
});

test("remove rejects a stale If-Match with MSG-11", async () => {
  const { service, repository } = buildService();

  await expect(
    service.remove(USER_ID, EXPERIENCE_ID, "2024-02-01T00:00:00.000Z"),
  ).resolves.toBeUndefined();
  await expect(
    service.remove(USER_ID, EXPERIENCE_ID, "2020-01-01T00:00:00.000Z"),
  ).rejects.toMatchObject({ code: "MSG-11", httpStatus: 412 });
  expect(repository.softDelete).toHaveBeenCalledTimes(1);
});

test("remove reports MSG-10 for a missing or foreign experience", async () => {
  const { service, repository } = buildService();
  repository.findById.mockResolvedValue(experience({ userId: "another-user" }));

  await expect(service.remove(USER_ID, EXPERIENCE_ID, null)).rejects.toMatchObject({
    code: "MSG-10",
  });
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
        created_at: "2024-01-01T00:00:00.000Z",
        updated_at: "2024-02-01T00:00:00.000Z",
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
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-02-01T00:00:00.000Z",
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
