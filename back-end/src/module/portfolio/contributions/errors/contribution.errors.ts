export class ContributionError extends Error {
  constructor(
    readonly code: string,
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "ContributionError";
  }
}

export const unauthorized = (): ContributionError =>
  new ContributionError("UNAUTHORIZED", 401, "Unauthorized");

export const featureForbidden = (): ContributionError =>
  new ContributionError(
    "MSG-5",
    403,
    "You do not have permission to perform this action on portfolio contributions.",
  );

export const unsupportedMediaType = (): ContributionError =>
  new ContributionError(
    "UNSUPPORTED_MEDIA_TYPE",
    415,
    "Unsupported content type. The request body must be application/json.",
  );

export const userNotFound = (): ContributionError =>
  new ContributionError("MSG-4", 404, "User not found");

export const languageNotFound = (): ContributionError =>
  new ContributionError("MSG-6", 400, "The specified language does not exist.");

export const duplicateLanguage = (): ContributionError =>
  new ContributionError(
    "MSG-7",
    400,
    "The same language is repeated in the contribution translations. Each language may appear only once.",
  );

export const translationsRequired = (): ContributionError =>
  new ContributionError("MSG-8", 400, "At least one contribution translation is required.");

export const missingField = (): ContributionError =>
  new ContributionError("MISSING_FIELD", 400, "A required field is missing or empty.");

export const invalidField = (field: string): ContributionError =>
  new ContributionError("INVALID_FIELD", 400, `Invalid value for field "${field}".`);

export const invalidUrl = (): ContributionError =>
  new ContributionError("INVALID_URL", 400, "Invalid URL. It must be a valid absolute URL.");

export const invalidTitle = (): ContributionError =>
  new ContributionError("INVALID_TITLE", 400, "Invalid title.");

export const invalidDescription = (): ContributionError =>
  new ContributionError("INVALID_DESCRIPTION", 400, "Invalid description.");

export const invalidId = (): ContributionError =>
  new ContributionError(
    "INVALID_ID",
    400,
    "Invalid identifier. It must be a well-formed identifier.",
  );

export const invalidUserId = (): ContributionError =>
  new ContributionError(
    "INVALID_USER_ID",
    400,
    "Invalid user identifier. It must be a well-formed user id.",
  );

export const invalidQueryParam = (): ContributionError =>
  new ContributionError("INVALID_QUERY_PARAM", 400, "Invalid query parameter.");

export const contributionNotFound = (): ContributionError =>
  new ContributionError("MSG-10", 404, "Contribution not found.");
