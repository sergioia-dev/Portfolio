import {
  isArticleId,
  validateArticleBody,
  validateArticleContent,
  validateArticleId,
  validateLanguageQuery,
  validateListFilter,
  validateListPaging,
  validateOnlyHtml,
  validateUserId,
} from "../../../src/module/articles/validators/article.validators";

const TAG_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const LANGUAGES = ["EN", "ES"];

const validTranslation = (overrides: Record<string, unknown> = {}) => ({
  language: "en",
  title: "Title",
  description: "Description",
  raw_markdown: "# Hi",
  ...overrides,
});

const validBody = (overrides: Record<string, unknown> = {}) => ({
  tag_ids: [TAG_ID, TAG_ID],
  translations: [validTranslation()],
  ...overrides,
});

const errorCode = (result: { value?: unknown; error?: { code: string } }) =>
  "error" in result ? result.error?.code : undefined;

test("isArticleId accepts UUIDs", () => {
  expect(isArticleId(TAG_ID)).toBe(true);
  expect(isArticleId("nope")).toBe(false);
});

test("validateArticleId rejects malformed identifiers", () => {
  expect(() => validateArticleId(TAG_ID)).not.toThrow();
  expect(() => validateArticleId("nope")).toThrow(expect.objectContaining({ code: "INVALID_ID" }));
});

test("validateUserId rejects malformed identifiers", () => {
  expect(() => validateUserId(TAG_ID)).not.toThrow();
  expect(() => validateUserId("nope")).toThrow(
    expect.objectContaining({ code: "INVALID_USER_ID" }),
  );
});

test("validateArticleBody normalizes languages and dedupes tags", () => {
  const result = validateArticleBody(validBody(), LANGUAGES);

  expect("value" in result && result.value).toEqual({
    tagIds: [TAG_ID],
    translations: [
      { language: "EN", title: "Title", description: "Description", rawMarkdown: "# Hi" },
    ],
  });
});

test("validateArticleBody omits tags when tag_ids is absent", () => {
  const result = validateArticleBody({ translations: [validTranslation()] }, LANGUAGES);
  expect("value" in result && result.value.tagIds).toEqual([]);
});

test("validateArticleBody requires translations", () => {
  expect(errorCode(validateArticleBody({}, LANGUAGES))).toBe("MSG-8");
  expect(errorCode(validateArticleBody({ translations: [] }, LANGUAGES))).toBe("MSG-8");
  expect(errorCode(validateArticleBody({ translations: "x" }, LANGUAGES))).toBe("MSG-8");
});

test("validateArticleBody rejects non-object translations", () => {
  expect(errorCode(validateArticleBody({ translations: ["x"] }, LANGUAGES))).toBe("INVALID_FIELD");
});

test("validateArticleBody rejects unknown and duplicate languages", () => {
  expect(
    errorCode(
      validateArticleBody({ translations: [validTranslation({ language: "FR" })] }, LANGUAGES),
    ),
  ).toBe("MSG-6");
  expect(
    errorCode(
      validateArticleBody(
        { translations: [validTranslation(), validTranslation({ language: "EN" })] },
        LANGUAGES,
      ),
    ),
  ).toBe("MSG-7");
});

test("validateArticleBody requires every translation field", () => {
  for (const field of ["language", "title", "description", "raw_markdown"]) {
    expect(
      errorCode(
        validateArticleBody(
          validBody({ translations: [validTranslation({ [field]: "" })] }),
          LANGUAGES,
        ),
      ),
    ).toBe("MISSING_FIELD");
  }
});

test("validateArticleBody rejects mistyped translation fields", () => {
  expect(
    errorCode(
      validateArticleBody(
        validBody({ translations: [validTranslation({ raw_markdown: 5 })] }),
        LANGUAGES,
      ),
    ),
  ).toBe("INVALID_FIELD");
  expect(errorCode(validateArticleBody(validBody({ tag_ids: "x" }), LANGUAGES))).toBe(
    "INVALID_FIELD",
  );
  expect(errorCode(validateArticleBody(validBody({ tag_ids: [5] }), LANGUAGES))).toBe(
    "INVALID_FIELD",
  );
});

test("validateArticleBody rejects malformed tag ids", () => {
  expect(errorCode(validateArticleBody(validBody({ tag_ids: ["nope"] }), LANGUAGES))).toBe(
    "INVALID_ID",
  );
});

test("validateArticleContent enforces title and description limits", () => {
  const input = {
    tagIds: [],
    translations: [{ language: "EN", title: "T", description: "D", rawMarkdown: "#" }],
  };
  expect(() => validateArticleContent(input)).not.toThrow();
  expect(() =>
    validateArticleContent({
      ...input,
      translations: [{ ...input.translations[0], title: "  " }],
    }),
  ).toThrow(expect.objectContaining({ code: "INVALID_TITLE" }));
  expect(() =>
    validateArticleContent({
      ...input,
      translations: [{ ...input.translations[0], title: "a".repeat(101) }],
    }),
  ).toThrow(expect.objectContaining({ code: "INVALID_TITLE" }));
  expect(() =>
    validateArticleContent({
      ...input,
      translations: [{ ...input.translations[0], description: "  " }],
    }),
  ).toThrow(expect.objectContaining({ code: "INVALID_DESCRIPTION" }));
  expect(() =>
    validateArticleContent({
      ...input,
      translations: [{ ...input.translations[0], description: "a".repeat(501) }],
    }),
  ).toThrow(expect.objectContaining({ code: "INVALID_DESCRIPTION" }));
});

test("validateListFilter resolves the language and tag", () => {
  expect(validateListFilter({ language: "es" }, LANGUAGES)).toEqual({
    value: { language: "ES", tagId: null },
  });
  expect(validateListFilter({ language: "ES", tag_id: TAG_ID }, LANGUAGES)).toEqual({
    value: { language: "ES", tagId: TAG_ID },
  });
});

test("validateListFilter validates language and tag errors", () => {
  expect(errorCode(validateListFilter({}, LANGUAGES))).toBe("MISSING_FIELD");
  expect(errorCode(validateListFilter({ language: "FR" }, LANGUAGES))).toBe("MSG-6");
  expect(errorCode(validateListFilter({ language: "EN", tag_id: 5 }, LANGUAGES))).toBe(
    "INVALID_ID",
  );
  expect(errorCode(validateListFilter({ language: "EN", tag_id: "nope" }, LANGUAGES))).toBe(
    "INVALID_ID",
  );
});

test("validateListPaging applies defaults", () => {
  expect(validateListPaging({})).toEqual({
    value: { limit: 20, page: 1, sort: "updated_at_desc" },
  });
});

test("validateListPaging accepts overrides", () => {
  expect(validateListPaging({ limit: "100", page: "3", sort: "title_asc" })).toEqual({
    value: { limit: 100, page: 3, sort: "title_asc" },
  });
});

test("validateListPaging rejects malformed values", () => {
  expect(errorCode(validateListPaging({ limit: "0" }))).toBe("INVALID_QUERY_PARAM");
  expect(errorCode(validateListPaging({ limit: "101" }))).toBe("INVALID_QUERY_PARAM");
  expect(errorCode(validateListPaging({ page: "0" }))).toBe("INVALID_QUERY_PARAM");
  expect(errorCode(validateListPaging({ page: "x" }))).toBe("INVALID_QUERY_PARAM");
  expect(errorCode(validateListPaging({ sort: "name_desc" }))).toBe("INVALID_QUERY_PARAM");
});

test("validateLanguageQuery resolves the catalog name", () => {
  expect(validateLanguageQuery({ language: "en" }, LANGUAGES)).toEqual({ value: "EN" });
  expect(errorCode(validateLanguageQuery({}, LANGUAGES))).toBe("MISSING_FIELD");
  expect(errorCode(validateLanguageQuery({ language: "FR" }, LANGUAGES))).toBe("MSG-6");
});

test("validateOnlyHtml parses the flag", () => {
  expect(validateOnlyHtml({})).toBe(false);
  expect(validateOnlyHtml({ only_html: "true" })).toBe(true);
  expect(validateOnlyHtml({ only_html: "false" })).toBe(false);
  expect(() => validateOnlyHtml({ only_html: "yes" })).toThrow(
    expect.objectContaining({ code: "INVALID_QUERY_PARAM" }),
  );
});

test("validateArticleBody validates optional absent values", () => {
  expect(errorCode(validateArticleBody(null, LANGUAGES))).toBe("MSG-8");
  expect(errorCode(validateArticleBody({ translations: [null] }, LANGUAGES))).toBe("INVALID_FIELD");
  expect(
    errorCode(
      validateArticleBody({ translations: [validTranslation({ title: undefined })] }, LANGUAGES),
    ),
  ).toBe("MISSING_FIELD");
});
