export class AuthError extends Error {
  constructor(
    readonly code: string,
    readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export const usernameTaken = (): AuthError =>
  new AuthError("MSG-1", 409, "Username is already taken.");

export const emailTaken = (): AuthError =>
  new AuthError("MSG-2", 409, "Email address is already registered.");

export const invalidPassword = (): AuthError =>
  new AuthError(
    "MSG-3",
    400,
    "Invalid password. It must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@ ! & - _).",
  );

export const invalidUsername = (): AuthError =>
  new AuthError(
    "INVALID_USERNAME",
    400,
    "Invalid username. It must be at most 39 characters of letters, numbers and single hyphens.",
  );

export const invalidEmail = (): AuthError =>
  new AuthError(
    "INVALID_EMAIL",
    400,
    "Invalid email. It must be a valid address of at most 320 characters.",
  );

export const invalidCredentials = (): AuthError => new AuthError("MSG-4", 401, "User not found");

export const unauthorized = (): AuthError => new AuthError("UNAUTHORIZED", 401, "Unauthorized");
