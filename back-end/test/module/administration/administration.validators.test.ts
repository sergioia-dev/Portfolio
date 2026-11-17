import {
  validateSearchQuery,
  validateUpdate,
  validateUserId,
} from "../../../src/module/administration/validators/administration.validators";

const USER_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";

test("validateSearchQuery applies the defaults", () => {
  expect(validateSearchQuery({ query: "sergio" })).toEqual({
    value: { query: "sergio", includeDeleted: false, limit: 20, page: 1 },
  });
});

test("validateSearchQuery trims the query and accepts include_deleted", () => {
  expect(
    validateSearchQuery({
      query: "  sergio  ",
      include_deleted: "true",
      limit: "100",
      page: "3",
    }),
  ).toEqual({
    value: { query: "sergio", includeDeleted: true, limit: 100, page: 3 },
  });
});

test("validateSearchQuery rejects a missing or blank query", () => {
  for (const input of [{}, { query: "" }, { query: "   " }, { query: 42 }]) {
    expect(validateSearchQuery(input)).toMatchObject({
      error: { code: "MISSING_FIELD", httpStatus: 400 },
    });
  }
});

test("validateSearchQuery rejects a query longer than 255 characters", () => {
  expect(validateSearchQuery({ query: "a".repeat(256) })).toMatchObject({
    error: { code: "INVALID_QUERY_PARAM", httpStatus: 400 },
  });
});

test("validateSearchQuery rejects malformed pagination and include_deleted", () => {
  for (const input of [
    { query: "sergio", limit: "0" },
    { query: "sergio", limit: "101" },
    { query: "sergio", limit: "abc" },
    { query: "sergio", page: "0" },
    { query: "sergio", page: "-1" },
    { query: "sergio", include_deleted: "maybe" },
    { query: "sergio", include_deleted: true },
  ]) {
    expect(validateSearchQuery(input)).toMatchObject({
      error: { code: "INVALID_QUERY_PARAM", httpStatus: 400 },
    });
  }
});

test("validateUpdate accepts username, email or both", () => {
  expect(validateUpdate({ username: "updated-name" })).toEqual({
    value: { username: "updated-name" },
  });
  expect(validateUpdate({ email: "updated@example.com" })).toEqual({
    value: { email: "updated@example.com" },
  });
  expect(validateUpdate({ username: "updated-name", email: "updated@example.com" })).toEqual({
    value: { username: "updated-name", email: "updated@example.com" },
  });
});

test("validateUpdate rejects an empty, non-object or unsupported body", () => {
  for (const input of [null, undefined, [], "body", {}, { role: "ADMIN" }]) {
    expect(validateUpdate(input)).toMatchObject({
      error: { code: "INVALID_FIELD", httpStatus: 400 },
    });
  }
});

test("validateUpdate rejects an invalid username", () => {
  for (const username of ["", "with space", "-leading", "trailing-", "a".repeat(40), 42]) {
    expect(validateUpdate({ username })).toMatchObject({
      error: { code: "INVALID_USERNAME", httpStatus: 400 },
    });
  }
});

test("validateUpdate rejects an invalid email", () => {
  for (const email of ["", "not-an-email", "a@b", `${"a".repeat(250)}@example.com`, 42]) {
    expect(validateUpdate({ email })).toMatchObject({
      error: { code: "INVALID_EMAIL", httpStatus: 400 },
    });
  }
});

test("validateUserId accepts a well-formed uuid", () => {
  expect(validateUserId(USER_ID)).toEqual({ value: USER_ID });
});

test("validateUserId rejects malformed identifiers", () => {
  for (const id of [undefined, "", "not-a-uuid", 42]) {
    expect(validateUserId(id)).toMatchObject({
      error: { code: "INVALID_USER_ID", httpStatus: 400 },
    });
  }
});
