export class ProjectError extends Error {
  constructor(
    readonly code: string,
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "ProjectError";
  }
}

export const unauthorized = (): ProjectError =>
  new ProjectError("UNAUTHORIZED", 401, "Unauthorized");

export const featureForbidden = (): ProjectError =>
  new ProjectError(
    "MSG-5",
    403,
    "You do not have permission to perform this action on portfolio projects.",
  );

export const unsupportedMediaType = (): ProjectError =>
  new ProjectError(
    "UNSUPPORTED_MEDIA_TYPE",
    415,
    "Unsupported content type. The request body must be application/json.",
  );

export const userNotFound = (): ProjectError => new ProjectError("MSG-4", 404, "User not found");

export const languageNotFound = (): ProjectError =>
  new ProjectError("MSG-6", 400, "The specified language does not exist.");

export const duplicateLanguage = (): ProjectError =>
  new ProjectError(
    "MSG-7",
    400,
    "The same language is repeated in the project translations. Each language may appear only once.",
  );

export const translationsRequired = (): ProjectError =>
  new ProjectError("MSG-8", 400, "At least one project translation is required.");

export const missingField = (): ProjectError =>
  new ProjectError("MISSING_FIELD", 400, "A required field is missing or empty.");

export const invalidField = (field: string): ProjectError =>
  new ProjectError("INVALID_FIELD", 400, `Invalid value for field "${field}".`);

export const invalidUrl = (): ProjectError =>
  new ProjectError("INVALID_URL", 400, "Invalid URL. It must be a valid absolute URL.");

export const invalidTitle = (): ProjectError =>
  new ProjectError("INVALID_TITLE", 400, "Invalid title.");

export const invalidDescription = (): ProjectError =>
  new ProjectError("INVALID_DESCRIPTION", 400, "Invalid description.");

export const invalidId = (): ProjectError =>
  new ProjectError("INVALID_ID", 400, "Invalid identifier. It must be a well-formed identifier.");

export const invalidUserId = (): ProjectError =>
  new ProjectError(
    "INVALID_USER_ID",
    400,
    "Invalid user identifier. It must be a well-formed user id.",
  );

export const invalidQueryParam = (): ProjectError =>
  new ProjectError("INVALID_QUERY_PARAM", 400, "Invalid query parameter.");

export const projectNotFound = (): ProjectError =>
  new ProjectError("MSG-10", 404, "Project not found.");

export const preconditionFailed = (): ProjectError =>
  new ProjectError(
    "MSG-11",
    412,
    "The project was modified by another request. Reload and try again.",
  );

export const tagNotFound = (): ProjectError => new ProjectError("MSG-14", 404, "Tag not found.");
