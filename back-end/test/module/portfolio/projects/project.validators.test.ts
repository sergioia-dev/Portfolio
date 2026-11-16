import type { ProjectError } from "../../../../src/module/portfolio/projects/errors/project.errors";
import {
  isProjectId,
  validateLanguageQuery,
  validateListFilter,
  validateListPaging,
  validateProjectBody,
  validateProjectContent,
  validateProjectId,
  validateUserId,
} from "../../../../src/module/portfolio/projects/validators/project.validators";

const PROJECT_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const TAG_ID = "6c1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const LANGUAGES = ["EN", "ES"];

type Validation<T> = { value: T } | { error: ProjectError };

const body = () => ({
  repository_url: "https://github.com/user/repo",
  website_url: "https://example.com",
  tag_ids: [TAG_ID],
  translations: [{ language: "en", title: "Title", description: "Description" }],
});

const unwrap = <T>(result: Validation<T>): T => {
  if ("error" in result) throw result.error;
  return result.value;
};

const errorCode = (result: Validation<unknown>): string | null =>
  "error" in result ? result.error.code : null;

test("validateProjectId accepts a uuid and rejects anything else", () => {
  expect(isProjectId(PROJECT_ID)).toBe(true);
  expect(isProjectId("not-an-id")).toBe(false);
  expect(() => validateProjectId(PROJECT_ID)).not.toThrow();
  expect(() => validateProjectId("not-an-id")).toThrow(
    expect.objectContaining({ code: "INVALID_ID" }),
  );
});

test("validateUserId reports INVALID_USER_ID", () => {
  expect(() => validateUserId(PROJECT_ID)).not.toThrow();
  expect(() => validateUserId("not-an-id")).toThrow(
    expect.objectContaining({ code: "INVALID_USER_ID" }),
  );
});

test("validateProjectBody normalizes the payload", () => {
  expect(unwrap(validateProjectBody(body(), LANGUAGES))).toEqual({
    repositoryUrl: "https://github.com/user/repo",
    websiteUrl: "https://example.com",
    tagIds: [TAG_ID],
    translations: [{ language: "EN", title: "Title", description: "Description" }],
  });
});

test("validateProjectBody clears an absent or empty website and tag list", () => {
  for (const extra of [{}, { website_url: null }, { website_url: "" }, { tag_ids: [] }]) {
    const payload = { ...body(), ...extra };
    const input = unwrap(validateProjectBody(payload, LANGUAGES));
    expect(input.tagIds).toEqual("tag_ids" in extra ? [] : [TAG_ID]);
  }
  expect(unwrap(validateProjectBody({ ...body(), website_url: "" }, LANGUAGES)).websiteUrl).toBe(
    null,
  );
  expect(
    unwrap(validateProjectBody({ ...body(), website_url: undefined }, LANGUAGES)).websiteUrl,
  ).toBe(null);
});

test("validateProjectBody deduplicates tag ids in order", () => {
  const other = "9a1e3b1e-3a1e-4a1e-9a1e-2f1c9f2e0c3b";
  const input = unwrap(
    validateProjectBody({ ...body(), tag_ids: [TAG_ID, other, TAG_ID] }, LANGUAGES),
  );

  expect(input.tagIds).toEqual([TAG_ID, other]);
});

test("validateProjectBody requires at least one translation", () => {
  for (const translations of [undefined, [], "en", {}]) {
    expect(errorCode(validateProjectBody({ ...body(), translations }, LANGUAGES))).toBe("MSG-8");
  }
});

test("validateProjectBody rejects non-object translation entries", () => {
  expect(errorCode(validateProjectBody({ ...body(), translations: ["en"] }, LANGUAGES))).toBe(
    "INVALID_FIELD",
  );
});

test("validateProjectBody reports unknown and duplicate languages", () => {
  expect(
    errorCode(
      validateProjectBody(
        { ...body(), translations: [{ language: "fr", title: "T", description: "D" }] },
        LANGUAGES,
      ),
    ),
  ).toBe("MSG-6");
  expect(
    errorCode(
      validateProjectBody(
        {
          ...body(),
          translations: [
            { language: "en", title: "T", description: "D" },
            { language: "EN", title: "T", description: "D" },
          ],
        },
        LANGUAGES,
      ),
    ),
  ).toBe("MSG-7");
});

test("validateProjectBody reports missing required fields", () => {
  for (const payload of [
    { ...body(), repository_url: undefined },
    { ...body(), repository_url: "" },
    { ...body(), translations: [{ language: "en", title: "", description: "D" }] },
    { ...body(), translations: [{ language: "en", title: "T" }] },
    { ...body(), translations: [{ title: "T", description: "D" }] },
  ]) {
    expect(errorCode(validateProjectBody(payload, LANGUAGES))).toBe("MISSING_FIELD");
  }
});

test("validateProjectBody reports invalid field types", () => {
  for (const payload of [
    { ...body(), repository_url: 5 },
    { ...body(), website_url: 5 },
    { ...body(), tag_ids: TAG_ID },
    { ...body(), tag_ids: [5] },
    { ...body(), translations: [{ language: 5, title: "T", description: "D" }] },
    { ...body(), translations: [{ language: "en", title: 5, description: "D" }] },
    { ...body(), translations: [{ language: "en", title: "T", description: 5 }] },
  ]) {
    expect(errorCode(validateProjectBody(payload, LANGUAGES))).toBe("INVALID_FIELD");
  }
});

test("validateProjectBody reports malformed tag ids", () => {
  expect(errorCode(validateProjectBody({ ...body(), tag_ids: ["not-an-id"] }, LANGUAGES))).toBe(
    "INVALID_ID",
  );
});

test("validateProjectContent accepts absolute urls and bounded text", () => {
  const input = unwrap(validateProjectBody(body(), LANGUAGES));

  expect(() => validateProjectContent(input)).not.toThrow();
  expect(() => validateProjectContent({ ...input, websiteUrl: null, tagIds: [] })).not.toThrow();
});

test("validateProjectContent rejects bad urls", () => {
  const input = unwrap(validateProjectBody(body(), LANGUAGES));

  for (const change of [
    { repositoryUrl: "not-a-url" },
    { repositoryUrl: `/relative/${"a".repeat(2048)}` },
    { websiteUrl: "mailto:user@example.com" },
  ]) {
    expect(() => validateProjectContent({ ...input, ...change })).toThrow(
      expect.objectContaining({ code: "INVALID_URL" }),
    );
  }
});

test("validateProjectContent rejects bad titles and descriptions", () => {
  const input = unwrap(validateProjectBody(body(), LANGUAGES));

  for (const title of ["   ", "a".repeat(256)]) {
    expect(() =>
      validateProjectContent({
        ...input,
        translations: [{ ...input.translations[0], title }],
      }),
    ).toThrow(expect.objectContaining({ code: "INVALID_TITLE" }));
  }

  for (const description of ["   ", "a".repeat(501)]) {
    expect(() =>
      validateProjectContent({
        ...input,
        translations: [{ ...input.translations[0], description }],
      }),
    ).toThrow(expect.objectContaining({ code: "INVALID_DESCRIPTION" }));
  }
});

test("validateListFilter requires and resolves the language", () => {
  expect(errorCode(validateListFilter({}, LANGUAGES))).toBe("MISSING_FIELD");
  expect(errorCode(validateListFilter({ language: "  " }, LANGUAGES))).toBe("MISSING_FIELD");
  expect(errorCode(validateListFilter({ language: "fr" }, LANGUAGES))).toBe("MSG-6");
  expect(unwrap(validateListFilter({ language: "es" }, LANGUAGES))).toEqual({
    language: "ES",
    tagId: null,
  });
});

test("validateListFilter validates the tag id", () => {
  expect(errorCode(validateListFilter({ language: "en", tag_id: 5 }, LANGUAGES))).toBe(
    "INVALID_ID",
  );
  expect(errorCode(validateListFilter({ language: "en", tag_id: "nope" }, LANGUAGES))).toBe(
    "INVALID_ID",
  );
  expect(unwrap(validateListFilter({ language: "en", tag_id: TAG_ID }, LANGUAGES))).toEqual({
    language: "EN",
    tagId: TAG_ID,
  });
});

test("validateListPaging applies defaults", () => {
  expect(unwrap(validateListPaging({}))).toEqual({
    limit: 20,
    page: 1,
    sort: "title_asc",
  });
});

test("validateListPaging accepts documented bounds", () => {
  expect(unwrap(validateListPaging({ limit: "100", page: "2", sort: "title_asc" }))).toEqual({
    limit: 100,
    page: 2,
    sort: "title_asc",
  });
});

test("validateListPaging rejects out of range values", () => {
  for (const query of [
    { limit: "0" },
    { limit: "101" },
    { limit: "ten" },
    { page: "0" },
    { page: "1.5" },
    { sort: "name_desc" },
    { limit: ["1", "2"] },
  ]) {
    expect(errorCode(validateListPaging(query))).toBe("INVALID_QUERY_PARAM");
  }
});

test("validateLanguageQuery requires and resolves the language", () => {
  expect(errorCode(validateLanguageQuery({}, LANGUAGES))).toBe("MISSING_FIELD");
  expect(errorCode(validateLanguageQuery({ language: "fr" }, LANGUAGES))).toBe("MSG-6");
  expect(unwrap(validateLanguageQuery({ language: "en" }, LANGUAGES))).toBe("EN");
});
