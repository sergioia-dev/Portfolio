import {
  type AuthError,
  invalidCredentials,
  invalidEmail,
  invalidPassword,
  invalidUsername,
} from "./auth.errors";

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

type Validation<T> = { value: T } | { error: AuthError };

const USERNAME_PATTERN = /^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_SPECIAL_PATTERN = /[@!&_-]/;

const readString = (body: unknown, field: string): string | null => {
  if (typeof body !== "object" || body === null) return null;
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
};

export const validateRegister = (body: unknown): Validation<RegisterInput> => {
  const username = readString(body, "username");
  if (username === null || username.length > 39 || !USERNAME_PATTERN.test(username)) {
    return { error: invalidUsername() };
  }

  const email = readString(body, "email");
  if (email === null || email.length > 320 || !EMAIL_PATTERN.test(email)) {
    return { error: invalidEmail() };
  }

  const password = readString(body, "password");
  if (
    password === null ||
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !PASSWORD_SPECIAL_PATTERN.test(password)
  ) {
    return { error: invalidPassword() };
  }

  return { value: { username, email, password } };
};

export const validateLogin = (body: unknown): Validation<LoginInput> => {
  const email = readString(body, "email");
  const password = readString(body, "password");
  if (email === null || !EMAIL_PATTERN.test(email) || password === null || password.length === 0) {
    return { error: invalidCredentials() };
  }

  return { value: { email, password } };
};
