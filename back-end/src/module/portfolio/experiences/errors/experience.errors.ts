export class ExperienceError extends Error {
  constructor(
    readonly code: string,
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "ExperienceError";
  }
}

export const unauthorized = (): ExperienceError =>
  new ExperienceError("UNAUTHORIZED", 401, "Unauthorized");

export const featureForbidden = (): ExperienceError =>
  new ExperienceError(
    "MSG-5",
    403,
    "You do not have permission to create portfolio experiences (missing feature PORTFOLIO_CREATE).",
  );

export const userNotFound = (): ExperienceError =>
  new ExperienceError("MSG-4", 404, "User not found");

export const languageNotFound = (): ExperienceError =>
  new ExperienceError("MSG-6", 400, "The specified language does not exist.");

export const duplicateLanguage = (): ExperienceError =>
  new ExperienceError(
    "MSG-7",
    400,
    "The same language is repeated in the experiences list. Each language may appear only once.",
  );

export const translationsRequired = (): ExperienceError =>
  new ExperienceError("MSG-8", 400, "At least one experience entry is required.");

export const invalidDateRange = (): ExperienceError =>
  new ExperienceError("MSG-9", 400, "The end date cannot be earlier than the start date.");

export const invalidUrl = (): ExperienceError =>
  new ExperienceError("INVALID_URL", 400, "Invalid URL. It must be a valid absolute URL.");

export const invalidDateFormat = (): ExperienceError =>
  new ExperienceError(
    "INVALID_DATE_FORMAT",
    400,
    "Invalid date. It must follow the format YYYY-MM-DD and be a real calendar date.",
  );

export const missingField = (): ExperienceError =>
  new ExperienceError("MISSING_FIELD", 400, "A required field is missing or empty.");

export const invalidTitle = (): ExperienceError =>
  new ExperienceError("INVALID_TITLE", 400, "Invalid title.");

export const invalidDescription = (): ExperienceError =>
  new ExperienceError("INVALID_DESCRIPTION", 400, "Invalid description.");

export const invalidId = (): ExperienceError =>
  new ExperienceError(
    "INVALID_ID",
    400,
    "Invalid identifier. It must be a well-formed experience id.",
  );

export const invalidQueryParam = (): ExperienceError =>
  new ExperienceError("INVALID_QUERY_PARAM", 400, "Invalid query parameter.");

export const experienceNotFound = (): ExperienceError =>
  new ExperienceError("MSG-10", 404, "Experience not found.");

export const preconditionFailed = (): ExperienceError =>
  new ExperienceError(
    "MSG-11",
    412,
    "The experience was modified by another request. Reload and try again.",
  );
