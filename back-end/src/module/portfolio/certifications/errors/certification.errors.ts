class CertificationError extends Error {
  constructor(
    readonly code: string,
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "CertificationError";
  }
}

const unauthorized = () =>
  new CertificationError("UNAUTHORIZED", 401, "Authentication is required.");

const featureForbidden = (feature: string) =>
  new CertificationError("MSG-5", 403, `Your role does not allow the ${feature} feature.`);

const userNotFound = () => new CertificationError("MSG-4", 404, "User not found.");

const invalidId = () =>
  new CertificationError(
    "INVALID_ID",
    400,
    "Invalid identifier. It must be a well-formed certification id.",
  );

const invalidUserId = () =>
  new CertificationError(
    "INVALID_USER_ID",
    400,
    "Invalid user identifier. It must be a well-formed user id.",
  );

const invalidCertificationId = () =>
  new CertificationError(
    "INVALID_CERTIFICATION_ID",
    400,
    "Invalid certification identifier. It must be a well-formed certification id.",
  );

const invalidQueryParam = () =>
  new CertificationError("INVALID_QUERY_PARAM", 400, "Invalid query parameter.");

const missingField = (field: string) =>
  new CertificationError("MISSING_FIELD", 400, `Missing required field: ${field}.`);

const invalidField = (field: string) =>
  new CertificationError("INVALID_FIELD", 400, `Invalid value for field: ${field}.`);

const invalidFormat = () =>
  new CertificationError("INVALID_FORMAT", 400, "Invalid format. The document must be a PDF.");

const unsupportedMediaType = () =>
  new CertificationError("UNSUPPORTED_MEDIA_TYPE", 415, "Unsupported content type.");

const invalidTitle = () =>
  new CertificationError("INVALID_TITLE", 400, "Invalid title. It must be 1 to 150 characters.");

const invalidDescription = () =>
  new CertificationError(
    "INVALID_DESCRIPTION",
    400,
    "Invalid description. It must be 1 to 1000 characters.",
  );

const titleTaken = () =>
  new CertificationError("MSG-13", 409, "A certification with this title already exists.");

const certificationNotFound = () =>
  new CertificationError("MSG-10", 404, "Certification not found.");

export {
  CertificationError,
  certificationNotFound,
  featureForbidden,
  invalidCertificationId,
  invalidDescription,
  invalidField,
  invalidFormat,
  invalidId,
  invalidQueryParam,
  invalidTitle,
  invalidUserId,
  missingField,
  titleTaken,
  unauthorized,
  unsupportedMediaType,
  userNotFound,
};
