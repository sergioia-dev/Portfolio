import type ContributionRepository from "../../../../src/module/portfolio/contributions/repository/contribution.repository";
import ContributionService from "../../../../src/module/portfolio/contributions/service/contribution.service";

const LANGUAGE_EN = { id: "language-en", name: "EN" };
const LANGUAGE_ES = { id: "language-es", name: "ES" };
const CONTRIBUTION_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const USER_ID = "6c1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";

const body = () => ({
  project_url: "https://github.com/organization/open-source-repo",
  pull_request_url: "https://github.com/organization/open-source-repo/pull/42",
  translations: [
    { language: "en", title: "Title", description: "Description" },
    { language: "es", title: "Titulo", description: "Descripcion" },
  ],
});

const contribution = (overrides: Record<string, unknown> = {}) => ({
  id: CONTRIBUTION_ID,
  userId: USER_ID,
  projectUrl: "https://github.com/organization/open-source-repo",
  pullRequestUrl: "https://github.com/organization/open-source-repo/pull/42",
  translations: [
    { id: CONTRIBUTION_ID, languageId: "language-en", title: "Title", description: "Description" },
    {
      id: CONTRIBUTION_ID,
      languageId: "language-es",
      title: "Titulo",
      description: "Descripcion",
    },
  ],
  ...overrides,
});

const createRepository = () => ({
  findLanguages: jest.fn().mockResolvedValue([LANGUAGE_EN, LANGUAGE_ES]),
  findUser: jest.fn().mockResolvedValue({ id: USER_ID, deletedAt: null }),
  findById: jest.fn().mockResolvedValue(contribution()),
  create: jest.fn().mockResolvedValue(undefined),
  saveFields: jest.fn().mockResolvedValue(undefined),
  saveTranslations: jest.fn().mockResolvedValue(undefined),
  hardDelete: jest.fn().mockResolvedValue(undefined),
  findReadOne: jest.fn().mockResolvedValue(contribution()),
  findReadPage: jest.fn().mockResolvedValue({ items: [contribution()], total: 1 }),
});

const buildService = () => {
  const repository = createRepository();
  return {
    service: new ContributionService(repository as unknown as ContributionRepository),
    repository,
  };
};

test("create stores the contribution and its translations", async () => {
  const { service, repository } = buildService();

  await expect(service.create(USER_ID, body())).resolves.toEqual({
    id: expect.any(String),
    project_url: "https://github.com/organization/open-source-repo",
    pull_request_url: "https://github.com/organization/open-source-repo/pull/42",
    translations: [
      { language: "EN", title: "Title", description: "Description" },
      { language: "ES", title: "Titulo", description: "Descripcion" },
    ],
  });
  expect(repository.create).toHaveBeenCalledWith({
    id: expect.any(String),
    userId: USER_ID,
    projectUrl: "https://github.com/organization/open-source-repo",
    pullRequestUrl: "https://github.com/organization/open-source-repo/pull/42",
    translations: [
      { languageId: "language-en", title: "Title", description: "Description" },
      { languageId: "language-es", title: "Titulo", description: "Descripcion" },
    ],
  });
});

test("create accepts a contribution without urls", async () => {
  const { service, repository } = buildService();
  const { project_url: _projectUrl, pull_request_url: _pullRequestUrl, ...withoutUrls } = body();

  await expect(service.create(USER_ID, withoutUrls)).resolves.toMatchObject({
    project_url: null,
    pull_request_url: null,
  });
  expect(repository.create).toHaveBeenCalledWith(
    expect.objectContaining({ projectUrl: null, pullRequestUrl: null }),
  );
});

test("create rejects an invalid body without writing", async () => {
  const { service, repository } = buildService();

  await expect(
    service.create(USER_ID, { project_url: "https://example.com" }),
  ).rejects.toMatchObject({ code: "MSG-8" });
  expect(repository.create).not.toHaveBeenCalled();
});

test("create validates the urls after parsing the body", async () => {
  const { service, repository } = buildService();

  await expect(
    service.create(USER_ID, { ...body(), project_url: "not-a-url" }),
  ).rejects.toMatchObject({ code: "INVALID_URL" });
  expect(repository.findLanguages).toHaveBeenCalled();
  expect(repository.create).not.toHaveBeenCalled();
});

test("create rejects an overlong title before writing", async () => {
  const { service, repository } = buildService();

  await expect(
    service.create(USER_ID, {
      ...body(),
      translations: [{ language: "en", title: "a".repeat(256), description: "Description" }],
    }),
  ).rejects.toMatchObject({ code: "INVALID_TITLE" });
  expect(repository.create).not.toHaveBeenCalled();
});

test("update replaces the fields and translations", async () => {
  const { service, repository } = buildService();

  await expect(service.update(USER_ID, CONTRIBUTION_ID, body())).resolves.toEqual({
    id: CONTRIBUTION_ID,
    project_url: "https://github.com/organization/open-source-repo",
    pull_request_url: "https://github.com/organization/open-source-repo/pull/42",
    translations: [
      { language: "EN", title: "Title", description: "Description" },
      { language: "ES", title: "Titulo", description: "Descripcion" },
    ],
  });
  expect(repository.saveFields).toHaveBeenCalledWith(CONTRIBUTION_ID, {
    projectUrl: "https://github.com/organization/open-source-repo",
    pullRequestUrl: "https://github.com/organization/open-source-repo/pull/42",
  });
  expect(repository.saveTranslations).toHaveBeenCalledWith(CONTRIBUTION_ID, [
    { languageId: "language-en", title: "Title", description: "Description" },
    { languageId: "language-es", title: "Titulo", description: "Descripcion" },
  ]);
});

test("update rejects a malformed id before reading", async () => {
  const { service, repository } = buildService();

  await expect(service.update(USER_ID, "not-an-id", body())).rejects.toMatchObject({
    code: "INVALID_ID",
  });
  expect(repository.findById).not.toHaveBeenCalled();
});

test("update reports MSG-10 for a missing or foreign contribution", async () => {
  for (const existing of [null, contribution({ userId: "another-user" })]) {
    const { service, repository } = buildService();
    repository.findById.mockResolvedValue(existing);

    await expect(service.update(USER_ID, CONTRIBUTION_ID, body())).rejects.toMatchObject({
      code: "MSG-10",
    });
    expect(repository.saveFields).not.toHaveBeenCalled();
  }
});

test("update validates the body before writing", async () => {
  const { service, repository } = buildService();

  await expect(service.update(USER_ID, CONTRIBUTION_ID, {})).rejects.toMatchObject({
    code: "MSG-8",
  });
  expect(repository.saveTranslations).not.toHaveBeenCalled();
});

test("remove hard deletes the contribution", async () => {
  const { service, repository } = buildService();

  await expect(service.remove(USER_ID, CONTRIBUTION_ID)).resolves.toBeUndefined();
  expect(repository.hardDelete).toHaveBeenCalledWith(CONTRIBUTION_ID);
});

test("remove rejects a malformed id and foreign contributions", async () => {
  const { service, repository } = buildService();

  await expect(service.remove(USER_ID, "not-an-id")).rejects.toMatchObject({ code: "INVALID_ID" });

  repository.findById.mockResolvedValue(contribution({ userId: "another-user" }));
  await expect(service.remove(USER_ID, CONTRIBUTION_ID)).rejects.toMatchObject({
    code: "MSG-10",
  });
  expect(repository.hardDelete).not.toHaveBeenCalled();
});

test("list returns the page and its metadata", async () => {
  const { service, repository } = buildService();

  await expect(service.list(USER_ID, { language: "en" })).resolves.toEqual({
    items: [
      {
        id: CONTRIBUTION_ID,
        project_url: "https://github.com/organization/open-source-repo",
        pull_request_url: "https://github.com/organization/open-source-repo/pull/42",
        translation: { language: "EN", title: "Title", description: "Description" },
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
    sort: "title_asc",
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
  for (const user of [null, { id: USER_ID, deletedAt: true }]) {
    const { service, repository } = buildService();
    repository.findUser.mockResolvedValue(user);

    await expect(service.list(USER_ID, { language: "en" })).rejects.toMatchObject({
      code: "MSG-4",
    });
    expect(repository.findReadPage).not.toHaveBeenCalled();
  }
});

test("list validates the user id, the filter and the paging", async () => {
  const { service } = buildService();

  await expect(service.list("not-an-id", { language: "en" })).rejects.toMatchObject({
    code: "INVALID_USER_ID",
  });
  await expect(service.list(USER_ID, {})).rejects.toMatchObject({ code: "MISSING_FIELD" });
  await expect(service.list(USER_ID, { language: "fr" })).rejects.toMatchObject({ code: "MSG-6" });
  await expect(service.list(USER_ID, { language: "en", page: "0" })).rejects.toMatchObject({
    code: "INVALID_QUERY_PARAM",
  });
});

test("get returns one contribution in the requested language", async () => {
  const { service, repository } = buildService();

  await expect(service.get(USER_ID, CONTRIBUTION_ID, { language: "es" })).resolves.toEqual({
    id: CONTRIBUTION_ID,
    project_url: "https://github.com/organization/open-source-repo",
    pull_request_url: "https://github.com/organization/open-source-repo/pull/42",
    translation: { language: "ES", title: "Titulo", description: "Descripcion" },
  });
  expect(repository.findReadOne).toHaveBeenCalledWith(USER_ID, CONTRIBUTION_ID, "language-es");
});

test("get reports MSG-10 when the translation is missing", async () => {
  const { service, repository } = buildService();
  repository.findReadOne.mockResolvedValue(null);

  await expect(service.get(USER_ID, CONTRIBUTION_ID, { language: "en" })).rejects.toMatchObject({
    code: "MSG-10",
  });
});

test("get validates the ids, the user and the query", async () => {
  const { service, repository } = buildService();

  await expect(service.get("not-an-id", CONTRIBUTION_ID, { language: "en" })).rejects.toMatchObject(
    { code: "INVALID_USER_ID" },
  );
  await expect(service.get(USER_ID, "not-an-id", { language: "en" })).rejects.toMatchObject({
    code: "INVALID_ID",
  });

  repository.findUser.mockResolvedValue(null);
  await expect(service.get(USER_ID, CONTRIBUTION_ID, { language: "en" })).rejects.toMatchObject({
    code: "MSG-4",
  });

  repository.findUser.mockResolvedValue({ id: USER_ID, deletedAt: false });
  repository.findById.mockResolvedValue(contribution({ userId: "another-user" }));
  await expect(service.get(USER_ID, CONTRIBUTION_ID, { language: "en" })).rejects.toMatchObject({
    code: "MSG-10",
  });

  repository.findById.mockResolvedValue(contribution());
  await expect(service.get(USER_ID, CONTRIBUTION_ID, { language: "fr" })).rejects.toMatchObject({
    code: "MSG-6",
  });
  await expect(service.get(USER_ID, CONTRIBUTION_ID, {})).rejects.toMatchObject({
    code: "MISSING_FIELD",
  });
});
