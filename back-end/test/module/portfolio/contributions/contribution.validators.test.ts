import type { ContributionError } from "../../../../src/module/portfolio/contributions/errors/contribution.errors";
import {
  isContributionId,
  validateContributionBody,
  validateContributionContent,
  validateContributionId,
  validateLanguageQuery,
  validateListPaging,
  validateUserId,
} from "../../../../src/module/portfolio/contributions/validators/contribution.validators";

const CONTRIBUTION_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const LANGUAGES = ["EN", "ES"];

type Validation<T> = { value: T } | { error: ContributionError };

const body = () => ({
  project_url: "https://github.com/organization/open-source-repo",
  pull_request_url: "https://github.com/organization/open-source-repo/pull/42",
  translations: [{ language: "en", title: "Title", description: "Description" }],
});

const unwrap = <T>(result: Validation<T>): T => {
  if ("error" in result) throw result.error;
  return result.value;
};

const errorCode = (result: Validation<unknown>): string | null =>
  "error" in result ? result.error.code : null;

test("validateContributionId accepts a uuid and rejects anything else", () => {
  expect(isContributionId(CONTRIBUTION_ID)).toBe(true);
  expect(isContributionId("not-an-id")).toBe(false);
  expect(() => validateContributionId(CONTRIBUTION_ID)).not.toThrow();
  expect(() => validateContributionId("not-an-id")).toThrow(
    expect.objectContaining({ code: "INVALID_ID" }),
  );
});

test("validateUserId reports INVALID_USER_ID", () => {
  expect(() => validateUserId(CONTRIBUTION_ID)).not.toThrow();
  expect(() => validateUserId("not-an-id")).toThrow(
    expect.objectContaining({ code: "INVALID_USER_ID" }),
  );
});

test("validateContributionBody normalizes the payload", () => {
  expect(unwrap(validateContributionBody(body(), LANGUAGES))).toEqual({
    projectUrl: "https://github.com/organization/open-source-repo",
    pullRequestUrl: "https://github.com/organization/open-source-repo/pull/42",
    translations: [{ language: "EN", title: "Title", description: "Description" }],
  });
});

test("validateContributionBody clears absent, null or empty urls", () => {
  for (const extra of [
    { project_url: undefined, pull_request_url: undefined },
    { project_url: null, pull_request_url: null },
    { project_url: "", pull_request_url: "" },
  ]) {
    expect(unwrap(validateContributionBody({ ...body(), ...extra }, LANGUAGES))).toMatchObject({
      projectUrl: null,
      pullRequestUrl: null,
    });
  }
});

test("validateContributionBody requires at least one translation", () => {
  for (const translations of [undefined, [], "en", {}]) {
    expect(errorCode(validateContributionBody({ ...body(), translations }, LANGUAGES))).toBe(
      "MSG-8",
    );
  }
});

test("validateContributionBody rejects non-object translation entries", () => {
  expect(errorCode(validateContributionBody({ ...body(), translations: ["en"] }, LANGUAGES))).toBe(
    "INVALID_FIELD",
  );
});

test("validateContributionBody reports unknown and duplicate languages", () => {
  expect(
    errorCode(
      validateContributionBody(
        { ...body(), translations: [{ language: "fr", title: "T", description: "D" }] },
        LANGUAGES,
      ),
    ),
  ).toBe("MSG-6");
  expect(
    errorCode(
      validateContributionBody(
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

test("validateContributionBody reports missing required fields", () => {
  for (const translations of [
    [{ language: "en", title: "", description: "D" }],
    [{ language: "en", title: "T" }],
    [{ title: "T", description: "D" }],
  ]) {
    expect(errorCode(validateContributionBody({ ...body(), translations }, LANGUAGES))).toBe(
      "MISSING_FIELD",
    );
  }
});

test("validateContributionBody reports invalid field types", () => {
  for (const payload of [
    { ...body(), project_url: 5 },
    { ...body(), pull_request_url: 5 },
    { ...body(), translations: [{ language: 5, title: "T", description: "D" }] },
    { ...body(), translations: [{ language: "en", title: 5, description: "D" }] },
    { ...body(), translations: [{ language: "en", title: "T", description: 5 }] },
  ]) {
    expect(errorCode(validateContributionBody(payload, LANGUAGES))).toBe("INVALID_FIELD");
  }
});

test("validateContributionContent accepts absolute urls and bounded text", () => {
  const input = unwrap(validateContributionBody(body(), LANGUAGES));

  expect(() => validateContributionContent(input)).not.toThrow();
  expect(() =>
    validateContributionContent({ ...input, projectUrl: null, pullRequestUrl: null }),
  ).not.toThrow();
});

test("validateContributionContent rejects bad urls", () => {
  const input = unwrap(validateContributionBody(body(), LANGUAGES));

  for (const change of [
    { projectUrl: "not-a-url" },
    { projectUrl: `/relative/${"a".repeat(2048)}` },
    { pullRequestUrl: "mailto:user@example.com" },
  ]) {
    expect(() => validateContributionContent({ ...input, ...change })).toThrow(
      expect.objectContaining({ code: "INVALID_URL" }),
    );
  }
});

test("validateContributionContent rejects bad titles and descriptions", () => {
  const input = unwrap(validateContributionBody(body(), LANGUAGES));

  for (const title of ["   ", "a".repeat(256)]) {
    expect(() =>
      validateContributionContent({
        ...input,
        translations: [{ ...input.translations[0], title }],
      }),
    ).toThrow(expect.objectContaining({ code: "INVALID_TITLE" }));
  }

  for (const description of ["   ", "a".repeat(501)]) {
    expect(() =>
      validateContributionContent({
        ...input,
        translations: [{ ...input.translations[0], description }],
      }),
    ).toThrow(expect.objectContaining({ code: "INVALID_DESCRIPTION" }));
  }
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
