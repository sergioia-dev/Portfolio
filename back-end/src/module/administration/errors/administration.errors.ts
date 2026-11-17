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

export const invalidId = (): AdministrationError =>
  new AdministrationError(
    "INVALID_ID",
    400,
    "Invalid identifier. It must be a well-formed identifier.",
  );

export const invalidName = (): AdministrationError =>
  new AdministrationError(
    "INVALID_NAME",
    400,
    "Invalid name. It must be non-blank and contain no control characters.",
  );

export const invalidDescription = (): AdministrationError =>
  new AdministrationError("INVALID_DESCRIPTION", 400, "Invalid description.");

export const roleNotFound = (): AdministrationError =>
  new AdministrationError("MSG-10", 404, "Role not found.");

export const functionalityNotFound = (): AdministrationError =>
  new AdministrationError("MSG-10", 404, "Functionality not found.");

export const roleNameTaken = (): AdministrationError =>
  new AdministrationError("MSG-13", 409, "A role with this name already exists.");

export const roleInUse = (): AdministrationError =>
  new AdministrationError(
    "INVALID_FIELD",
    409,
    "The role is assigned to one or more users and cannot be deleted.",
  );

export const roleGrantsAdministrator = (): AdministrationError =>
  new AdministrationError("MSG-5", 403, "You do not have permission to perform this action.");
