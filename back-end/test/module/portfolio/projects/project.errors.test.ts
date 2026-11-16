import {
  duplicateLanguage,
  featureForbidden,
  invalidDescription,
  invalidField,
  invalidId,
  invalidQueryParam,
  invalidTitle,
  invalidUrl,
  invalidUserId,
  languageNotFound,
  missingField,
  ProjectError,
  preconditionFailed,
  projectNotFound,
  tagNotFound,
  translationsRequired,
  unauthorized,
  unsupportedMediaType,
  userNotFound,
} from "../../../../src/module/portfolio/projects/errors/project.errors";

test.each([
  [unauthorized, "UNAUTHORIZED", 401],
  [featureForbidden, "MSG-5", 403],
  [unsupportedMediaType, "UNSUPPORTED_MEDIA_TYPE", 415],
  [userNotFound, "MSG-4", 404],
  [languageNotFound, "MSG-6", 400],
  [duplicateLanguage, "MSG-7", 400],
  [translationsRequired, "MSG-8", 400],
  [missingField, "MISSING_FIELD", 400],
  [() => invalidField("tag_ids"), "INVALID_FIELD", 400],
  [invalidUrl, "INVALID_URL", 400],
  [invalidTitle, "INVALID_TITLE", 400],
  [invalidDescription, "INVALID_DESCRIPTION", 400],
  [invalidId, "INVALID_ID", 400],
  [invalidUserId, "INVALID_USER_ID", 400],
  [invalidQueryParam, "INVALID_QUERY_PARAM", 400],
  [projectNotFound, "MSG-10", 404],
  [preconditionFailed, "MSG-11", 412],
  [tagNotFound, "MSG-14", 404],
] as const)("%p carries its code and status", (factory, code, httpStatus) => {
  const error = factory();

  expect(error).toBeInstanceOf(ProjectError);
  expect(error).toMatchObject({ name: "ProjectError", code, httpStatus });
  expect(error.message).not.toHaveLength(0);
});

test("invalidField names the offending field", () => {
  expect(invalidField("tag_ids").message).toContain("tag_ids");
});
