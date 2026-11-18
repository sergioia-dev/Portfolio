import type ArticleRepository from "../../../src/module/articles/repository/article.repository";
import type { TranslationFields } from "../../../src/module/articles/repository/article.repository";
import ArticleService, {
  renderMarkdown,
} from "../../../src/module/articles/service/article.service";
import type Article from "../../../src/shared/database/article/article.entity";
import type Language from "../../../src/shared/database/language/language.entity";
import type Tag from "../../../src/shared/database/tag/tag.entity";

const USER_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const OTHER_USER_ID = "3b1e3a1e-0c3b-4a1e-9a1e-2f1c9f2e0c3b";
const ARTICLE_ID = "9b1e3a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const TAG_ID = "1e3a1e3b-1e3a-4a1e-9a1e-2f1c9f2e0c3b";
const LANGUAGE_EN_ID = "language-en";
const LANGUAGE_ES_ID = "language-es";
const UPDATED_AT = new Date("2025-01-01T00:00:00.000Z");

const tag = (id: string, name: string): Tag => ({ id, name }) as unknown as Tag;
const languages = (): Language[] =>
  [
    { id: LANGUAGE_EN_ID, name: "EN" },
    { id: LANGUAGE_ES_ID, name: "ES" },
  ] as unknown as Language[];
const translation = (overrides: Partial<TranslationFields> = {}): TranslationFields => ({
  languageId: LANGUAGE_EN_ID,
  title: "Title",
  description: "Description",
  rawMarkdown: "# Hi",
  renderedHtml: "<h1>Hi</h1>",
  updatedAt: UPDATED_AT,
  ...overrides,
});
const article = (
  overrides: {
    translations?: TranslationFields[];
    tags?: Tag[];
    isDeleted?: boolean;
    userId?: string;
  } = {},
): Article =>
  ({
    id: ARTICLE_ID,
    userId: USER_ID,
    isDeleted: false,
    deletedAt: null,
    tags: [tag(TAG_ID, "typescript")],
    translations: [translation()],
    ...overrides,
  }) as unknown as Article;

const validBody = () => ({
  tag_ids: [TAG_ID],
  translations: [
    {
      language: "en",
      title: "Title",
      description: "Description",
      raw_markdown: "# Hi",
    },
  ],
});

const createRepository = () => ({
  findLanguages: jest.fn(),
  findUser: jest.fn(),
  findTags: jest.fn(),
  findById: jest.fn(),
  findOwned: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  findReadOne: jest.fn(),
  findReadPage: jest.fn(),
});

let repository: ReturnType<typeof createRepository>;
let service: ArticleService;

beforeEach(() => {
  repository = createRepository();
  service = new ArticleService(repository as unknown as ArticleRepository);
});

test("renderMarkdown renders markdown and strips unsafe html", () => {
  const html = renderMarkdown(
    '# Hello\n\n<img src="x" onerror="alert(1)"><script>alert(1)</script>[link](javascript:alert(1))',
  );

  expect(html).toContain("<h1>Hello</h1>");
  expect(html).not.toContain("<script");
  expect(html).not.toContain("onerror");
  expect(html).not.toContain("javascript:");
});

test("create stores rendered and sanitized translations", async () => {
  repository.findLanguages.mockResolvedValue(languages());
  repository.findTags.mockResolvedValue([tag(TAG_ID, "typescript")]);
  repository.create.mockResolvedValue(undefined);
  repository.findById.mockResolvedValue(article());

  const result = await service.create(USER_ID, validBody());

  expect(repository.create).toHaveBeenCalledWith({
    id: expect.any(String),
    userId: USER_ID,
    tagIds: [TAG_ID],
    translations: [
      expect.objectContaining({
        languageId: LANGUAGE_EN_ID,
        rawMarkdown: "# Hi",
        renderedHtml: expect.stringContaining("<h1>Hi</h1>"),
      }),
    ],
  });
  expect(result).toEqual({
    id: ARTICLE_ID,
    tags: [{ id: TAG_ID, name: "typescript" }],
    translations: [
      {
        language: "EN",
        title: "Title",
        description: "Description",
        rawMarkdown: "# Hi",
        renderedHtml: "<h1>Hi</h1>",
        updatedAt: UPDATED_AT,
      },
    ],
  });
});

test("create rejects invalid bodies before loading tags", async () => {
  repository.findLanguages.mockResolvedValue(languages());

  await expect(service.create(USER_ID, {})).rejects.toMatchObject({ code: "MSG-8" });
  expect(repository.findTags).not.toHaveBeenCalled();
  expect(repository.create).not.toHaveBeenCalled();
});

test("create rejects tags the user does not own", async () => {
  repository.findLanguages.mockResolvedValue(languages());
  repository.findTags.mockResolvedValue([]);

  await expect(service.create(USER_ID, validBody())).rejects.toMatchObject({ code: "MSG-14" });
  expect(repository.create).not.toHaveBeenCalled();
});

test("create rejects invalid content", async () => {
  repository.findLanguages.mockResolvedValue(languages());
  repository.findTags.mockResolvedValue([]);

  await expect(
    service.create(USER_ID, {
      translations: [{ ...validBody().translations[0], title: "  " }],
    }),
  ).rejects.toMatchObject({ code: "INVALID_TITLE" });
});

test("create fails when the stored article cannot be reloaded", async () => {
  repository.findLanguages.mockResolvedValue(languages());
  repository.create.mockResolvedValue(undefined);
  repository.findById.mockResolvedValue(null);

  await expect(
    service.create(USER_ID, { translations: validBody().translations }),
  ).rejects.toMatchObject({ code: "MSG-10" });
});

test("update replaces tags and translations", async () => {
  repository.findById
    .mockResolvedValueOnce(article())
    .mockResolvedValueOnce(
      article({ tags: [], translations: [translation({ rawMarkdown: "# New" })] }),
    );
  repository.findLanguages.mockResolvedValue(languages());
  repository.findTags.mockResolvedValue([]);
  repository.update.mockResolvedValue(undefined);

  const body = {
    translations: [
      {
        language: "es",
        title: "Nuevo",
        description: "Descripcion",
        raw_markdown: "# New",
      },
    ],
  };
  const result = await service.update(USER_ID, ARTICLE_ID, body, null);

  expect(repository.update).toHaveBeenCalledWith(
    ARTICLE_ID,
    [
      expect.objectContaining({
        languageId: LANGUAGE_ES_ID,
        renderedHtml: expect.stringContaining("<h1>New</h1>"),
      }),
    ],
    [],
  );
  expect(result.tags).toEqual([]);
});

test("update preserves the rendered html of unchanged markdown", async () => {
  const existing = article({
    translations: [translation({ renderedHtml: "<h1>Stored</h1>", updatedAt: UPDATED_AT })],
  });
  repository.findById.mockResolvedValueOnce(existing).mockResolvedValueOnce(existing);
  repository.findLanguages.mockResolvedValue(languages());
  repository.findTags.mockResolvedValue([tag(TAG_ID, "typescript")]);
  repository.update.mockResolvedValue(undefined);

  await service.update(USER_ID, ARTICLE_ID, validBody(), null);

  expect(repository.update).toHaveBeenCalledWith(
    ARTICLE_ID,
    [expect.objectContaining({ renderedHtml: "<h1>Stored</h1>", updatedAt: UPDATED_AT })],
    [TAG_ID],
  );
});

test("update rejects a stale If-Match value", async () => {
  repository.findById.mockResolvedValue(article());

  await expect(
    service.update(USER_ID, ARTICLE_ID, validBody(), "2000-01-01T00:00:00.000Z"),
  ).rejects.toMatchObject({ code: "MSG-11" });
  expect(repository.update).not.toHaveBeenCalled();
});

test("update accepts a matching If-Match value", async () => {
  repository.findById.mockResolvedValue(article());
  repository.findLanguages.mockResolvedValue(languages());
  repository.findTags.mockResolvedValue([tag(TAG_ID, "typescript")]);
  repository.update.mockResolvedValue(undefined);

  await expect(
    service.update(USER_ID, ARTICLE_ID, validBody(), UPDATED_AT.toISOString()),
  ).resolves.toBeDefined();
});

test("update rejects articles owned by someone else", async () => {
  repository.findById.mockResolvedValue(article({ userId: OTHER_USER_ID }));

  await expect(service.update(USER_ID, ARTICLE_ID, validBody(), null)).rejects.toMatchObject({
    code: "MSG-10",
  });
});

test("update rejects missing articles", async () => {
  repository.findById.mockResolvedValue(null);

  await expect(service.update(USER_ID, ARTICLE_ID, validBody(), null)).rejects.toMatchObject({
    code: "MSG-10",
  });
});

test("update validates the article identifier", async () => {
  await expect(service.update(USER_ID, "nope", validBody(), null)).rejects.toMatchObject({
    code: "INVALID_ID",
  });
});

test("remove soft deletes an owned article", async () => {
  repository.findOwned.mockResolvedValue(article());
  repository.softDelete.mockResolvedValue(undefined);

  await service.remove(USER_ID, ARTICLE_ID, null);

  expect(repository.softDelete).toHaveBeenCalledWith(ARTICLE_ID);
});

test("remove is idempotent for an already deleted article", async () => {
  repository.findOwned.mockResolvedValue(article({ isDeleted: true }));

  await expect(service.remove(USER_ID, ARTICLE_ID, null)).resolves.toBeUndefined();
  expect(repository.softDelete).not.toHaveBeenCalled();
});

test("remove rejects a stale If-Match value", async () => {
  repository.findOwned.mockResolvedValue(article());

  await expect(
    service.remove(USER_ID, ARTICLE_ID, "2000-01-01T00:00:00.000Z"),
  ).rejects.toMatchObject({ code: "MSG-11" });
  expect(repository.softDelete).not.toHaveBeenCalled();
});

test("remove rejects articles that do not belong to the user", async () => {
  repository.findOwned.mockResolvedValue(null);

  await expect(service.remove(USER_ID, ARTICLE_ID, null)).rejects.toMatchObject({ code: "MSG-10" });
});

test("list returns a page of translated summaries", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findLanguages.mockResolvedValue(languages());
  repository.findReadPage.mockResolvedValue({ items: [article()], total: 21 });

  const result = await service.list(USER_ID, {
    language: "en",
    limit: "10",
    page: "2",
    sort: "title_asc",
  });

  expect(repository.findReadPage).toHaveBeenCalledWith(USER_ID, {
    languageId: LANGUAGE_EN_ID,
    tagId: null,
    limit: 10,
    page: 2,
    sort: "title_asc",
  });
  expect(result).toEqual({
    items: [
      {
        id: ARTICLE_ID,
        tags: [{ id: TAG_ID, name: "typescript" }],
        translation: {
          language: "EN",
          title: "Title",
          description: "Description",
          updatedAt: UPDATED_AT,
        },
      },
    ],
    meta: {
      userId: USER_ID,
      language: "EN",
      page: 2,
      limit: 10,
      total: 21,
      total_pages: 3,
    },
  });
});

test("list filters by an owned tag", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findLanguages.mockResolvedValue(languages());
  repository.findTags.mockResolvedValue([tag(TAG_ID, "typescript")]);
  repository.findReadPage.mockResolvedValue({ items: [], total: 0 });

  await service.list(USER_ID, { language: "EN", tag_id: TAG_ID });

  expect(repository.findTags).toHaveBeenCalledWith(USER_ID, [TAG_ID]);
  expect(repository.findReadPage).toHaveBeenCalledWith(
    USER_ID,
    expect.objectContaining({ tagId: TAG_ID }),
  );
});

test("list rejects unknown tags", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findLanguages.mockResolvedValue(languages());
  repository.findTags.mockResolvedValue([]);

  await expect(service.list(USER_ID, { language: "EN", tag_id: TAG_ID })).rejects.toMatchObject({
    code: "MSG-14",
  });
});

test("list rejects deleted users", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: true });

  await expect(service.list(USER_ID, { language: "EN" })).rejects.toMatchObject({ code: "MSG-4" });
});

test("list rejects unknown users", async () => {
  repository.findUser.mockResolvedValue(null);

  await expect(service.list(USER_ID, { language: "EN" })).rejects.toMatchObject({ code: "MSG-4" });
});

test("list validates the user, language and paging", async () => {
  await expect(service.list("nope", { language: "EN" })).rejects.toMatchObject({
    code: "INVALID_USER_ID",
  });

  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findLanguages.mockResolvedValue(languages());

  await expect(service.list(USER_ID, {})).rejects.toMatchObject({ code: "MISSING_FIELD" });
  await expect(service.list(USER_ID, { language: "EN", limit: "0" })).rejects.toMatchObject({
    code: "INVALID_QUERY_PARAM",
  });
});

test("get returns the full translation", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findOwned.mockResolvedValue(article());
  repository.findLanguages.mockResolvedValue(languages());
  repository.findReadOne.mockResolvedValue(article());

  const result = await service.get(USER_ID, ARTICLE_ID, { language: "en" });

  expect(result).toEqual({
    id: ARTICLE_ID,
    tags: [{ id: TAG_ID, name: "typescript" }],
    translation: {
      language: "EN",
      title: "Title",
      description: "Description",
      rawMarkdown: "# Hi",
      renderedHtml: "<h1>Hi</h1>",
      updatedAt: UPDATED_AT,
    },
  });
});

test("get omits raw markdown when only_html is true", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findOwned.mockResolvedValue(article());
  repository.findLanguages.mockResolvedValue(languages());
  repository.findReadOne.mockResolvedValue(article());

  const result = await service.get(USER_ID, ARTICLE_ID, { language: "en", only_html: "true" });

  expect(result.translation).toEqual({
    language: "EN",
    title: "Title",
    description: "Description",
    renderedHtml: "<h1>Hi</h1>",
    updatedAt: UPDATED_AT,
  });
  expect("rawMarkdown" in result.translation).toBe(false);
});

test("get rejects deleted or foreign articles", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findOwned.mockResolvedValue(article({ isDeleted: true }));

  await expect(service.get(USER_ID, ARTICLE_ID, { language: "EN" })).rejects.toMatchObject({
    code: "MSG-10",
  });

  repository.findOwned.mockResolvedValue(null);
  await expect(service.get(USER_ID, ARTICLE_ID, { language: "EN" })).rejects.toMatchObject({
    code: "MSG-10",
  });
});

test("get rejects articles without the requested translation", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findOwned.mockResolvedValue(article());
  repository.findLanguages.mockResolvedValue(languages());
  repository.findReadOne.mockResolvedValue(article({ translations: [] }));

  await expect(service.get(USER_ID, ARTICLE_ID, { language: "EN" })).rejects.toMatchObject({
    code: "MSG-10",
  });
});

test("get rejects a missing read row", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findOwned.mockResolvedValue(article());
  repository.findLanguages.mockResolvedValue(languages());
  repository.findReadOne.mockResolvedValue(null);

  await expect(service.get(USER_ID, ARTICLE_ID, { language: "EN" })).rejects.toMatchObject({
    code: "MSG-10",
  });
});

test("get validates identifiers, users and language", async () => {
  await expect(service.get("nope", ARTICLE_ID, { language: "EN" })).rejects.toMatchObject({
    code: "INVALID_USER_ID",
  });

  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: true });
  await expect(service.get(USER_ID, ARTICLE_ID, { language: "EN" })).rejects.toMatchObject({
    code: "MSG-4",
  });

  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findOwned.mockResolvedValue(article());
  repository.findLanguages.mockResolvedValue(languages());

  await expect(service.get(USER_ID, "nope", { language: "EN" })).rejects.toMatchObject({
    code: "INVALID_ID",
  });
  await expect(service.get(USER_ID, ARTICLE_ID, {})).rejects.toMatchObject({
    code: "MISSING_FIELD",
  });
  await expect(service.get(USER_ID, ARTICLE_ID, { language: "FR" })).rejects.toMatchObject({
    code: "MSG-6",
  });
  await expect(
    service.get(USER_ID, ARTICLE_ID, { language: "EN", only_html: "yes" }),
  ).rejects.toMatchObject({ code: "INVALID_QUERY_PARAM" });
});

test("list throws when a page row has no translation", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findLanguages.mockResolvedValue(languages());
  repository.findReadPage.mockResolvedValue({
    items: [article({ translations: [] })],
    total: 1,
  });

  await expect(service.list(USER_ID, { language: "EN" })).rejects.toMatchObject({ code: "MSG-10" });
});
