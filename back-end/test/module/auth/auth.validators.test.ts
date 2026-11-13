import type { AuthError } from "../../../src/module/auth/auth.errors";
import { validateLogin, validateRegister } from "../../../src/module/auth/auth.validators";

const validRegister = {
  username: "john-doe",
  email: "john@example.com",
  password: "Password1!",
};

const succeed = <T>(result: { value: T } | { error: AuthError }): T => {
  if ("error" in result) throw result.error;
  return result.value;
};

const fail = (result: { value: unknown } | { error: AuthError }): AuthError => {
  if (!("error" in result)) throw new Error("Expected a validation error");
  return result.error;
};

test("register accepts a valid username, email and password", () => {
  expect(succeed(validateRegister(validRegister))).toEqual(validRegister);
});

test("register accepts a 39 character username", () => {
  const username = "a".repeat(39);
  expect(succeed(validateRegister({ ...validRegister, username })).username).toBe(username);
});

test("register rejects usernames that break the pattern or length", () => {
  const usernames = [
    null,
    42,
    "",
    "-john",
    "john-",
    "john--doe",
    "john doe",
    "john_doe",
    "a".repeat(40),
  ];

  for (const username of usernames) {
    const error = fail(validateRegister({ ...validRegister, username }));
    expect(error.code).toBe("INVALID_USERNAME");
    expect(error.httpStatus).toBe(400);
  }
});

test("register rejects malformed, non-string and oversized emails", () => {
  const emails = [
    null,
    42,
    "not-an-email",
    "john@example",
    "john.example.com",
    `${"a".repeat(320)}@b.co`,
  ];

  for (const email of emails) {
    const error = fail(validateRegister({ ...validRegister, email }));
    expect(error.code).toBe("INVALID_EMAIL");
    expect(error.httpStatus).toBe(400);
  }
});

test("register rejects bodies that are not objects", () => {
  expect(fail(validateRegister(null)).code).toBe("INVALID_USERNAME");
  expect(fail(validateRegister("john")).code).toBe("INVALID_USERNAME");
});

test("register rejects passwords missing a rule", () => {
  const passwords = [null, 42, "Short1!", "password1!", "PASSWORD1!", "Password!", "Password1"];

  for (const password of passwords) {
    const error = fail(validateRegister({ ...validRegister, password }));
    expect(error.code).toBe("MSG-3");
    expect(error.httpStatus).toBe(400);
  }
});

test("register accepts every allowed special character", () => {
  for (const special of ["@", "!", "&", "-", "_"]) {
    const password = `Password1${special}`;
    expect(succeed(validateRegister({ ...validRegister, password })).password).toBe(password);
  }
});

test("login accepts a valid email and non-empty password", () => {
  const input = { email: "john@example.com", password: "anything" };
  expect(succeed(validateLogin(input))).toEqual(input);
});

test("login rejects invalid bodies as invalid credentials", () => {
  const bodies = [
    null,
    {},
    { email: "not-an-email", password: "anything" },
    { email: "john@example.com", password: "" },
    { email: "john@example.com" },
  ];

  for (const body of bodies) {
    const error = fail(validateLogin(body));
    expect(error.code).toBe("MSG-4");
    expect(error.httpStatus).toBe(401);
  }
});
