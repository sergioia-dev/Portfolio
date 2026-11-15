import { ExperienceError } from "../../../../src/module/portfolio/experiences/errors/experience.errors";
import {
  isExperienceId,
  validateExperienceBody,
  validateExperienceId,
  validateLanguageQuery,
  validateListQuery,
} from "../../../../src/module/portfolio/experiences/validators/experience.validators";

const LANGUAGES = ["EN", "ES"];

const validBody = () => ({
  website_url: "https://example.com",
  start_date: "2020-01-01",
  end_date: "2021-01-01",
  translations: [{ language: "en", title: "Developer", description: "Built things" }],
});

const readError = (body: unknown, languages = LANGUAGES) => {
  const validation = validateExperienceBody(body, languages);
  if (!("error" in validation)) throw new Error("expected a validation error");
  return validation.error;
};

test("a valid body is normalized", () => {
  const validation = validateExperienceBody(validBody(), LANGUAGES);

  expect(validation).toEqual({
    value: {
      websiteUrl: "https://example.com",
      startDate: "2020-01-01",
      endDate: "2021-01-01",
      translations: [{ language: "EN", title: "Developer", description: "Built things" }],
    },
  });
});

test("optional url and end date may be omitted", () => {
  const validation = validateExperienceBody(
    { start_date: "2020-01-01", translations: validBody().translations },
    LANGUAGES,
  );

  expect(validation).toMatchObject({ value: { websiteUrl: null, endDate: null } });
});

test("missing translations are rejected with MSG-8", () => {
  expect(readError({ start_date: "2020-01-01" }).code).toBe("MSG-8");
  expect(readError({ start_date: "2020-01-01", translations: [] }).code).toBe("MSG-8");
  expect(readError("not an object").code).toBe("MSG-8");
});

test("an unknown language is rejected with MSG-6", () => {
  const body = validBody();
  body.translations = [{ ...body.translations[0], language: "FR" }];

  expect(readError(body).code).toBe("MSG-6");
});

test("a repeated language is rejected with MSG-7 regardless of case", () => {
  const body = validBody();
  body.translations = [
    { language: "en", title: "A", description: "A" },
    { language: "EN", title: "B", description: "B" },
  ];

  expect(readError(body).code).toBe("MSG-7");
});

test("a missing start date is rejected with MISSING_FIELD", () => {
  const body = validBody();
  delete (body as { start_date?: string }).start_date;

  expect(readError(body).code).toBe("MISSING_FIELD");
});

test("an entry without title or description is rejected with MISSING_FIELD", () => {
  expect(
    readError({
      start_date: "2020-01-01",
      translations: [{ language: "en", description: "Built things" }],
    }).code,
  ).toBe("MISSING_FIELD");
  expect(
    readError({
      start_date: "2020-01-01",
      translations: [{ language: "en", title: "Developer" }],
    }).code,
  ).toBe("MISSING_FIELD");
  expect(readError({ start_date: "2020-01-01", translations: ["not an object"] }).code).toBe(
    "MISSING_FIELD",
  );
});

test("an end date before the start date is rejected with MSG-9", () => {
  const body = validBody();
  body.end_date = "2019-12-31";

  expect(readError(body).code).toBe("MSG-9");
});

test("an invalid url is rejected with INVALID_URL", () => {
  expect(readError({ ...validBody(), website_url: "not a url" }).code).toBe("INVALID_URL");
  expect(
    readError({ ...validBody(), website_url: `https://example.com/${"a".repeat(2048)}` }).code,
  ).toBe("INVALID_URL");
});

test("an invalid date is rejected with INVALID_DATE_FORMAT", () => {
  expect(readError({ ...validBody(), start_date: "2020-13-01" }).code).toBe("INVALID_DATE_FORMAT");
  expect(readError({ ...validBody(), start_date: "2020-1-1" }).code).toBe("INVALID_DATE_FORMAT");
  expect(readError({ ...validBody(), end_date: "2021-02-30" }).code).toBe("INVALID_DATE_FORMAT");
});

test("a title longer than 100 characters or blank is rejected with INVALID_TITLE", () => {
  const longTitle = {
    ...validBody(),
    translations: [{ language: "en", title: "a".repeat(101), description: "ok" }],
  };
  const blankTitle = {
    ...validBody(),
    translations: [{ language: "en", title: "   ", description: "ok" }],
  };

  expect(readError(longTitle).code).toBe("INVALID_TITLE");
  expect(readError(blankTitle).code).toBe("INVALID_TITLE");
});

test("a description longer than 1000 characters or blank is rejected with INVALID_DESCRIPTION", () => {
  const longDescription = {
    ...validBody(),
    translations: [{ language: "en", title: "ok", description: "a".repeat(1001) }],
  };
  const blankDescription = {
    ...validBody(),
    translations: [{ language: "en", title: "ok", description: "   " }],
  };

  expect(readError(longDescription).code).toBe("INVALID_DESCRIPTION");
  expect(readError(blankDescription).code).toBe("INVALID_DESCRIPTION");
});

test("isExperienceId accepts only uuid values", () => {
  expect(isExperienceId("2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e")).toBe(true);
  expect(isExperienceId("2F1C9F2E-0C3B-4A1E-9A1E-3B1E3A1E3A1E")).toBe(true);
  expect(isExperienceId("")).toBe(false);
  expect(isExperienceId("1234")).toBe(false);
  expect(isExperienceId("zzzzzzzz-0c3b-4a1e-9a1e-3b1e3a1e3a1e")).toBe(false);
});

test("validateExperienceId throws INVALID_ID for a malformed id", () => {
  expect(() => validateExperienceId("not-an-id")).toThrow(ExperienceError);
  expect(() => validateExperienceId("not-an-id")).toThrow(
    expect.objectContaining({ code: "INVALID_ID", httpStatus: 400 }) as Error,
  );
  expect(() => validateExperienceId("2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e")).not.toThrow();
});

test("validateLanguageQuery requires a known language", () => {
  const missing = validateLanguageQuery({}, LANGUAGES);
  const unknown = validateLanguageQuery({ language: "fr" }, LANGUAGES);
  const found = validateLanguageQuery({ language: "es" }, LANGUAGES);

  expect("error" in missing && missing.error.code).toBe("MISSING_FIELD");
  expect("error" in unknown && unknown.error.code).toBe("MSG-6");
  expect(found).toEqual({ value: "ES" });
});

test("validateListQuery applies the documented defaults", () => {
  expect(validateListQuery({ language: "en" }, LANGUAGES)).toEqual({
    value: { language: "EN", limit: 20, page: 1, sort: "start_date_desc" },
  });
});

test("validateListQuery accepts explicit pagination and sort", () => {
  expect(
    validateListQuery(
      { language: "en", limit: "100", page: "3", sort: "created_at_desc" },
      LANGUAGES,
    ),
  ).toEqual({ value: { language: "EN", limit: 100, page: 3, sort: "created_at_desc" } });
});

test("validateListQuery rejects invalid query parameters", () => {
  for (const query of [
    { language: "en", limit: "0" },
    { language: "en", limit: "101" },
    { language: "en", limit: "abc" },
    { language: "en", page: "0" },
    { language: "en", page: "-2" },
    { language: "en", sort: "title_asc" },
  ]) {
    const validation = validateListQuery(query, LANGUAGES);
    expect("error" in validation && validation.error.code).toBe("INVALID_QUERY_PARAM");
  }
});

test("validateListQuery reports the language errors first", () => {
  expect(validateListQuery({ limit: "0" }, LANGUAGES)).toMatchObject({
    error: { code: "MISSING_FIELD" },
  });
  expect(validateListQuery({ language: "fr", limit: "0" }, LANGUAGES)).toMatchObject({
    error: { code: "MSG-6" },
  });
});
