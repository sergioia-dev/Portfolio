export class ArticleError extends Error {
  constructor(
    readonly code: string,
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "ArticleError";
  }
}

export const unauthorized = (): ArticleError =>
  new ArticleError("UNAUTHORIZED", 401, "Unauthorized");

export const featureForbidden = (): ArticleError =>
  new ArticleError("MSG-5", 403, "You do not have permission to perform this action on articles.");

export const unsupportedMediaType = (): ArticleError =>
  new ArticleError(
    "UNSUPPORTED_MEDIA_TYPE",
    415,
    "Unsupported content type. The request body must be application/json.",
  );

export const userNotFound = (): ArticleError => new ArticleError("MSG-4", 404, "User not found");

export const languageNotFound = (): ArticleError =>
  new ArticleError("MSG-6", 400, "The specified language does not exist.");

export const duplicateLanguage = (): ArticleError =>
  new ArticleError(
    "MSG-7",
    400,
    "The same language is repeated in the article translations. Each language may appear only once.",
  );

export const translationsRequired = (): ArticleError =>
  new ArticleError("MSG-8", 400, "At least one article translation is required.");

export const missingField = (): ArticleError =>
  new ArticleError("MISSING_FIELD", 400, "A required field is missing or empty.");

export const invalidField = (field: string): ArticleError =>
  new ArticleError("INVALID_FIELD", 400, `Invalid value for field "${field}".`);

export const invalidTitle = (): ArticleError =>
  new ArticleError("INVALID_TITLE", 400, "Invalid title.");

export const invalidDescription = (): ArticleError =>
  new ArticleError("INVALID_DESCRIPTION", 400, "Invalid description.");

export const invalidId = (): ArticleError =>
  new ArticleError("INVALID_ID", 400, "Invalid identifier. It must be a well-formed identifier.");

export const invalidUserId = (): ArticleError =>
  new ArticleError(
    "INVALID_USER_ID",
    400,
    "Invalid user identifier. It must be a well-formed user id.",
  );

export const invalidQueryParam = (): ArticleError =>
  new ArticleError("INVALID_QUERY_PARAM", 400, "Invalid query parameter.");

export const articleNotFound = (): ArticleError =>
  new ArticleError("MSG-10", 404, "Article not found.");

export const commentNotFound = (): ArticleError =>
  new ArticleError("MSG-10", 404, "Comment not found.");

export const preconditionFailed = (): ArticleError =>
  new ArticleError(
    "MSG-11",
    412,
    "The article was modified by another request. Reload and try again.",
  );

export const tagNotFound = (): ArticleError => new ArticleError("MSG-14", 404, "Tag not found.");

export const notCommentAuthor = (): ArticleError =>
  new ArticleError("MSG-5", 403, "Only the comment author may edit this comment.");

export const notCommentOwner = (): ArticleError =>
  new ArticleError(
    "MSG-5",
    403,
    "Only the comment author or the article owner may delete this comment.",
  );
