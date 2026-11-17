export class UserError extends Error {
  constructor(
    readonly code: string,
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "UserError";
  }
}

export const unauthorized = (): UserError => new UserError("UNAUTHORIZED", 401, "Unauthorized");

export const unsupportedMediaType = (): UserError =>
  new UserError(
    "UNSUPPORTED_MEDIA_TYPE",
    415,
    "Unsupported content type. The request body must be application/json.",
  );

export const usernameTaken = (): UserError =>
  new UserError("MSG-1", 409, "Username is already taken.");

export const emailTaken = (): UserError =>
  new UserError("MSG-2", 409, "Email address is already registered.");

export const invalidPassword = (): UserError =>
  new UserError(
    "MSG-3",
    400,
    "Invalid password. It must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@ ! & - _).",
  );

export const invalidUsername = (): UserError =>
  new UserError(
    "INVALID_USERNAME",
    400,
    "Invalid username. It must be at most 39 characters of letters, numbers and single hyphens.",
  );

export const invalidEmail = (): UserError =>
  new UserError("INVALID_EMAIL", 400, "Invalid email. It must be a valid email address.");

export const invalidField = (field: string): UserError =>
  new UserError("INVALID_FIELD", 400, `Invalid value for field "${field}".`);

export const invalidName = (): UserError =>
  new UserError(
    "INVALID_NAME",
    400,
    "Invalid full name. It must not be blank or contain control characters.",
  );

export const invalidFormat = (): UserError =>
  new UserError("INVALID_FORMAT", 400, "Invalid phone format. It must be a valid phone number.");

export const invalidUrl = (): UserError =>
  new UserError("INVALID_URL", 400, "Invalid URL. It must be a valid absolute URL.");
