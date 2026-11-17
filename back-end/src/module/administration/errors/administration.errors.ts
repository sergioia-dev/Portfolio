export class AdministrationError extends Error {
  constructor(
    readonly code: string,
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "AdministrationError";
  }
}

export const unauthorized = (): AdministrationError =>
  new AdministrationError("UNAUTHORIZED", 401, "Unauthorized");

export const featureForbidden = (): AdministrationError =>
  new AdministrationError("MSG-5", 403, "You do not have permission to perform this action.");

export const invalidUserId = (): AdministrationError =>
  new AdministrationError(
    "INVALID_USER_ID",
    400,
    "Invalid user identifier. It must be a well-formed user id.",
  );

export const userNotFound = (): AdministrationError =>
  new AdministrationError("MSG-4", 404, "User not found");

export const administratorTarget = (): AdministrationError =>
  new AdministrationError("MSG-5", 403, "You do not have permission to perform this action.");

export const invalidField = (field: string): AdministrationError =>
  new AdministrationError("INVALID_FIELD", 400, `Invalid value for field "${field}".`);

export const invalidUsername = (): AdministrationError =>
  new AdministrationError(
    "INVALID_USERNAME",
    400,
    "Invalid username. It must be at most 39 characters of letters, numbers and single hyphens.",
  );

export const invalidEmail = (): AdministrationError =>
  new AdministrationError("INVALID_EMAIL", 400, "Invalid email. It must be a valid email address.");

export const usernameTaken = (): AdministrationError =>
  new AdministrationError("MSG-1", 409, "Username is already taken.");

export const emailTaken = (): AdministrationError =>
  new AdministrationError("MSG-2", 409, "Email address is already registered.");

export const missingField = (field: string): AdministrationError =>
  new AdministrationError("MISSING_FIELD", 400, `Missing required field: ${field}.`);

export const invalidQueryParam = (): AdministrationError =>
  new AdministrationError("INVALID_QUERY_PARAM", 400, "Invalid query parameter.");
