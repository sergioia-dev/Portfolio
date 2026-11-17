import {
  validateCreateRole,
  validateRoleId,
  validateSearchQuery,
  validateUpdate,
  validateUpdateRole,
  validateUserId,
} from "../../../src/module/administration/validators/administration.validators";

const USER_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const ROLE_ID = "9b1e3a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const OTHER_ROLE_ID = "1b4c5d6e-7f80-4a1e-9a1e-2f1c9f2e0c3b";

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

test("validateUpdate accepts rol_id alongside username and email", () => {
  expect(validateUpdate({ rol_id: ROLE_ID })).toEqual({ value: { rolId: ROLE_ID } });
  expect(validateUpdate({ username: "updated-name", rol_id: ROLE_ID })).toEqual({
    value: { username: "updated-name", rolId: ROLE_ID },
  });
});

test("validateUpdate rejects a malformed rol_id", () => {
  for (const rolId of ["", "not-a-uuid", 42, null]) {
    expect(validateUpdate({ rol_id: rolId })).toMatchObject({
      error: { code: "INVALID_ID", httpStatus: 400 },
    });
  }
});

test("validateUpdate checks username and email before rol_id", () => {
  expect(validateUpdate({ username: 42, rol_id: "not-a-uuid" })).toMatchObject({
    error: { code: "INVALID_USERNAME" },
  });
  expect(validateUpdate({ email: "nope", rol_id: "not-a-uuid" })).toMatchObject({
    error: { code: "INVALID_EMAIL" },
  });
});

test("validateCreateRole trims the text, defaults functionality_ids and deduplicates", () => {
  expect(validateCreateRole({ name: "  PORTFOLIO_EDITOR ", description: " Editors " })).toEqual({
    value: {
      name: "PORTFOLIO_EDITOR",
      description: "Editors",
      functionalityIds: [],
    },
  });
  expect(
    validateCreateRole({
      name: "PORTFOLIO_EDITOR",
      description: "Editors",
      functionality_ids: [ROLE_ID, ROLE_ID, OTHER_ROLE_ID],
    }),
  ).toEqual({
    value: {
      name: "PORTFOLIO_EDITOR",
      description: "Editors",
      functionalityIds: [ROLE_ID, OTHER_ROLE_ID],
    },
  });
});

test("validateCreateRole requires name and description", () => {
  for (const input of [
    {},
    { description: "Editors" },
    { name: "PORTFOLIO_EDITOR" },
    { name: null, description: "Editors" },
  ]) {
    expect(validateCreateRole(input)).toMatchObject({
      error: { code: "MISSING_FIELD", httpStatus: 400 },
    });
  }
});

test("validateCreateRole rejects unsupported fields and invalid types", () => {
  for (const input of [
    { name: "PORTFOLIO_EDITOR", description: "Editors", role: "OWNER" },
    { name: 42, description: "Editors" },
    { name: "PORTFOLIO_EDITOR", description: 42 },
    { name: "a".repeat(101), description: "Editors" },
    { name: "PORTFOLIO_EDITOR", description: "Editors", functionality_ids: "ids" },
    { name: "PORTFOLIO_EDITOR", description: "Editors", functionality_ids: [42] },
  ]) {
    expect(validateCreateRole(input)).toMatchObject({
      error: { code: "INVALID_FIELD", httpStatus: 400 },
    });
  }
});

test("validateCreateRole rejects blank names, control characters and long descriptions", () => {
  for (const name of ["", "   ", "PORTFOLIO\u0000EDITOR"]) {
    expect(validateCreateRole({ name, description: "Editors" })).toMatchObject({
      error: { code: "INVALID_NAME", httpStatus: 400 },
    });
  }
  for (const description of ["", "   ", "a".repeat(501)]) {
    expect(validateCreateRole({ name: "PORTFOLIO_EDITOR", description })).toMatchObject({
      error: { code: "INVALID_DESCRIPTION", httpStatus: 400 },
    });
  }
});

test("validateCreateRole rejects malformed functionality identifiers", () => {
  for (const id of ["", "not-a-uuid"]) {
    expect(
      validateCreateRole({
        name: "PORTFOLIO_EDITOR",
        description: "Editors",
        functionality_ids: [id],
      }),
    ).toMatchObject({ error: { code: "INVALID_ID", httpStatus: 400 } });
  }
});

test("validateUpdateRole requires functionality_ids", () => {
  expect(validateUpdateRole({ name: "PORTFOLIO_EDITOR", description: "Editors" })).toMatchObject({
    error: { code: "MISSING_FIELD", httpStatus: 400 },
  });
  expect(
    validateUpdateRole({
      name: "PORTFOLIO_EDITOR",
      description: "Editors",
      functionality_ids: null,
    }),
  ).toMatchObject({ error: { code: "MISSING_FIELD", httpStatus: 400 } });
  expect(
    validateUpdateRole({ name: "PORTFOLIO_EDITOR", description: "Editors", functionality_ids: [] }),
  ).toEqual({
    value: { name: "PORTFOLIO_EDITOR", description: "Editors", functionalityIds: [] },
  });
});

test("validateRoleId accepts a well-formed uuid and rejects the rest", () => {
  expect(validateRoleId(ROLE_ID)).toEqual({ value: ROLE_ID });
  for (const id of [undefined, "", "not-a-uuid", 42]) {
    expect(validateRoleId(id)).toMatchObject({ error: { code: "INVALID_ID", httpStatus: 400 } });
  }
});
