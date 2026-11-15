class TagError extends Error {
  constructor(
    readonly code: string,
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "TagError";
  }
}

const unauthorized = () => new TagError("UNAUTHORIZED", 401, "Authentication is required.");

const featureForbidden = (feature: string) =>
  new TagError("MSG-5", 403, `Your role does not allow the ${feature} feature.`);

const userNotFound = () => new TagError("MSG-4", 404, "User not found.");

const invalidId = (kind = "tag") =>
  new TagError("INVALID_ID", 400, `Invalid ${kind} id. It must be a well-formed UUID.`);

const preconditionFailed = () =>
  new TagError("MSG-11", 412, "Precondition failed. The resource was modified by another request.");

const invalidQueryParam = () =>
  new TagError("INVALID_QUERY_PARAM", 400, "Invalid query parameter.");

const missingField = (field: string) =>
  new TagError("MISSING_FIELD", 400, `Missing required field: ${field}.`);

const tagNameTaken = () => new TagError("MSG-13", 409, "A tag with this name already exists.");

const invalidName = () =>
  new TagError(
    "INVALID_NAME",
    400,
    "Invalid name. It must be 1 to 50 characters and contain no control characters.",
  );

const invalidField = (field: string) =>
  new TagError("INVALID_FIELD", 400, `Invalid value for field: ${field}.`);

const invalidImage = () => new TagError("INVALID_IMAGE", 400, "Invalid image.");

const unsupportedMediaType = () =>
  new TagError("UNSUPPORTED_MEDIA_TYPE", 415, "Unsupported content type.");

const tagNotFound = () => new TagError("MSG-14", 404, "Tag not found.");

const tagInUse = () => new TagError("MSG-15", 406, "Tag in use.");

export {
  featureForbidden,
  invalidField,
  invalidId,
  invalidImage,
  invalidName,
  invalidQueryParam,
  missingField,
  preconditionFailed,
  TagError,
  tagInUse,
  tagNameTaken,
  tagNotFound,
  unauthorized,
  unsupportedMediaType,
  userNotFound,
};
