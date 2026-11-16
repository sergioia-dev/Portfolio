import type ProjectRepository from "../../../../src/module/portfolio/projects/repository/project.repository";
import ProjectService from "../../../../src/module/portfolio/projects/service/project.service";

const LANGUAGE_EN = { id: "language-en", name: "EN" };
const LANGUAGE_ES = { id: "language-es", name: "ES" };
const PROJECT_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const USER_ID = "6c1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const TAG_ID = "9a1e3b1e-3a1e-4a1e-9a1e-2f1c9f2e0c3b";
const TAG = { id: TAG_ID, name: "TypeScript" };

const body = () => ({
  repository_url: "https://github.com/user/repo",
  website_url: "https://example.com",
  tag_ids: [TAG_ID],
  translations: [
    { language: "en", title: "Title", description: "Description" },
    { language: "es", title: "Titulo", description: "Descripcion" },
  ],
});

const project = (overrides: Record<string, unknown> = {}) => ({
  id: PROJECT_ID,
  userId: USER_ID,
  repositoryUrl: "https://github.com/user/repo",
  websiteUrl: "https://example.com",
  tags: [TAG],
  translations: [
    { id: PROJECT_ID, languageId: "language-en", title: "Title", description: "Description" },
    { id: PROJECT_ID, languageId: "language-es", title: "Titulo", description: "Descripcion" },
  ],
  ...overrides,
});

const createRepository = () => ({
  findLanguages: jest.fn().mockResolvedValue([LANGUAGE_EN, LANGUAGE_ES]),
  findUser: jest.fn().mockResolvedValue({ id: USER_ID, deletedAt: null }),
  findTags: jest.fn().mockResolvedValue([TAG]),
  findById: jest.fn().mockResolvedValue(project()),
  create: jest.fn().mockResolvedValue(undefined),
  saveFields: jest.fn().mockResolvedValue(undefined),
  saveTranslations: jest.fn().mockResolvedValue(undefined),
  saveTags: jest.fn().mockResolvedValue(undefined),
  hardDelete: jest.fn().mockResolvedValue(undefined),
  findReadOne: jest.fn().mockResolvedValue(project()),
  findReadPage: jest.fn().mockResolvedValue({ items: [project()], total: 1 }),
});

const buildService = () => {
  const repository = createRepository();
  return {
    service: new ProjectService(repository as unknown as ProjectRepository),
    repository,
  };
};

test("create stores the project, its tags and its translations", async () => {
  const { service, repository } = buildService();

  await expect(service.create(USER_ID, body())).resolves.toEqual({
    id: expect.any(String),
    repository_url: "https://github.com/user/repo",
    website_url: "https://example.com",
    tags: [{ id: TAG_ID, name: "TypeScript" }],
    translations: [
      { language: "EN", title: "Title", description: "Description" },
      { language: "ES", title: "Titulo", description: "Descripcion" },
    ],
  });
  expect(repository.findTags).toHaveBeenCalledWith(USER_ID, [TAG_ID]);
  expect(repository.create).toHaveBeenCalledWith({
    id: expect.any(String),
    userId: USER_ID,
    repositoryUrl: "https://github.com/user/repo",
    websiteUrl: "https://example.com",
    tagIds: [TAG_ID],
    translations: [
      { languageId: "language-en", title: "Title", description: "Description" },
      { languageId: "language-es", title: "Titulo", description: "Descripcion" },
    ],
  });
});

test("create rejects an invalid body without writing", async () => {
  const { service, repository } = buildService();

  await expect(
    service.create(USER_ID, { repository_url: "https://example.com" }),
  ).rejects.toMatchObject({ code: "MSG-8" });
  expect(repository.create).not.toHaveBeenCalled();
});

test("create reports MSG-14 when a tag is missing or owned by somebody else", async () => {
  const { service, repository } = buildService();
  repository.findTags.mockResolvedValue([]);

  await expect(service.create(USER_ID, body())).rejects.toMatchObject({ code: "MSG-14" });
  expect(repository.create).not.toHaveBeenCalled();
});

test("create validates the urls after the tag check", async () => {
  const { service, repository } = buildService();

  await expect(
    service.create(USER_ID, { ...body(), repository_url: "not-a-url" }),
  ).rejects.toMatchObject({ code: "INVALID_URL" });
  expect(repository.findTags).toHaveBeenCalled();
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

test("update replaces the fields, translations and tags", async () => {
  const { service, repository } = buildService();

  await expect(service.update(USER_ID, PROJECT_ID, body())).resolves.toEqual({
    id: PROJECT_ID,
    repository_url: "https://github.com/user/repo",
    website_url: "https://example.com",
    tags: [{ id: TAG_ID, name: "TypeScript" }],
    translations: [
      { language: "EN", title: "Title", description: "Description" },
      { language: "ES", title: "Titulo", description: "Descripcion" },
    ],
  });
  expect(repository.saveFields).toHaveBeenCalledWith(PROJECT_ID, {
    repositoryUrl: "https://github.com/user/repo",
    websiteUrl: "https://example.com",
  });
  expect(repository.saveTranslations).toHaveBeenCalledWith(PROJECT_ID, [
    { languageId: "language-en", title: "Title", description: "Description" },
    { languageId: "language-es", title: "Titulo", description: "Descripcion" },
  ]);
  expect(repository.saveTags).toHaveBeenCalledWith(PROJECT_ID, [TAG_ID]);
});

test("update clears tags when tag_ids is omitted", async () => {
  const { service, repository } = buildService();
  const { tag_ids: _tagIds, ...withoutTags } = body();

  await service.update(USER_ID, PROJECT_ID, withoutTags);

  expect(repository.findTags).not.toHaveBeenCalled();
  expect(repository.saveTags).toHaveBeenCalledWith(PROJECT_ID, []);
});

test("update rejects a malformed id before reading", async () => {
  const { service, repository } = buildService();

  await expect(service.update(USER_ID, "not-an-id", body())).rejects.toMatchObject({
    code: "INVALID_ID",
  });
  expect(repository.findById).not.toHaveBeenCalled();
});

test("update reports MSG-10 for a missing or foreign project", async () => {
  for (const existing of [null, project({ userId: "another-user" })]) {
    const { service, repository } = buildService();
    repository.findById.mockResolvedValue(existing);

    await expect(service.update(USER_ID, PROJECT_ID, body())).rejects.toMatchObject({
      code: "MSG-10",
    });
    expect(repository.saveFields).not.toHaveBeenCalled();
  }
});

test("update validates the body before writing", async () => {
  const { service, repository } = buildService();

  await expect(service.update(USER_ID, PROJECT_ID, {})).rejects.toMatchObject({
    code: "MSG-8",
  });
  expect(repository.saveTranslations).not.toHaveBeenCalled();
});

test("remove hard deletes the project", async () => {
  const { service, repository } = buildService();

  await expect(service.remove(USER_ID, PROJECT_ID)).resolves.toBeUndefined();
  expect(repository.hardDelete).toHaveBeenCalledWith(PROJECT_ID);
});

test("remove reports MSG-10 for a missing or foreign project", async () => {
  const { service, repository } = buildService();
  repository.findById.mockResolvedValue(project({ userId: "another-user" }));

  await expect(service.remove(USER_ID, PROJECT_ID)).rejects.toMatchObject({ code: "MSG-10" });
  expect(repository.hardDelete).not.toHaveBeenCalled();
});

test("list returns the page and its metadata", async () => {
  const { service, repository } = buildService();

  await expect(service.list(USER_ID, { language: "en" })).resolves.toEqual({
    items: [
      {
        id: PROJECT_ID,
        repository_url: "https://github.com/user/repo",
        website_url: "https://example.com",
        tags: [{ id: TAG_ID, name: "TypeScript" }],
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
    tagId: null,
    limit: 20,
    page: 1,
    sort: "title_asc",
  });
});

test("list filters by an owned tag", async () => {
  const { service, repository } = buildService();

  await service.list(USER_ID, { language: "en", tag_id: TAG_ID });

  expect(repository.findTags).toHaveBeenCalledWith(USER_ID, [TAG_ID]);
  expect(repository.findReadPage).toHaveBeenCalledWith(
    USER_ID,
    expect.objectContaining({ tagId: TAG_ID }),
  );
});

test("list reports MSG-14 for a foreign tag before validating paging", async () => {
  const { service, repository } = buildService();
  repository.findTags.mockResolvedValue([]);

  await expect(
    service.list(USER_ID, { language: "en", tag_id: TAG_ID, limit: "0" }),
  ).rejects.toMatchObject({ code: "MSG-14" });
  expect(repository.findReadPage).not.toHaveBeenCalled();
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

test("get returns one project in the requested language", async () => {
  const { service, repository } = buildService();

  await expect(service.get(USER_ID, PROJECT_ID, { language: "es" })).resolves.toEqual({
    id: PROJECT_ID,
    repository_url: "https://github.com/user/repo",
    website_url: "https://example.com",
    tags: [{ id: TAG_ID, name: "TypeScript" }],
    translation: { language: "ES", title: "Titulo", description: "Descripcion" },
  });
  expect(repository.findReadOne).toHaveBeenCalledWith(USER_ID, PROJECT_ID, "language-es");
});

test("get reports MSG-10 when the translation is missing", async () => {
  const { service, repository } = buildService();
  repository.findReadOne.mockResolvedValue(null);

  await expect(service.get(USER_ID, PROJECT_ID, { language: "en" })).rejects.toMatchObject({
    code: "MSG-10",
  });
});

test("get validates the ids, the user and the query", async () => {
  const { service, repository } = buildService();

  await expect(service.get("not-an-id", PROJECT_ID, { language: "en" })).rejects.toMatchObject({
    code: "INVALID_USER_ID",
  });
  await expect(service.get(USER_ID, "not-an-id", { language: "en" })).rejects.toMatchObject({
    code: "INVALID_ID",
  });

  repository.findUser.mockResolvedValue(null);
  await expect(service.get(USER_ID, PROJECT_ID, { language: "en" })).rejects.toMatchObject({
    code: "MSG-4",
  });

  repository.findUser.mockResolvedValue({ id: USER_ID, deletedAt: false });
  repository.findById.mockResolvedValue(project({ userId: "another-user" }));
  await expect(service.get(USER_ID, PROJECT_ID, { language: "en" })).rejects.toMatchObject({
    code: "MSG-10",
  });

  repository.findById.mockResolvedValue(project());
  await expect(service.get(USER_ID, PROJECT_ID, { language: "fr" })).rejects.toMatchObject({
    code: "MSG-6",
  });
  await expect(service.get(USER_ID, PROJECT_ID, {})).rejects.toMatchObject({
    code: "MISSING_FIELD",
  });
});
