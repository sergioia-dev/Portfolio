import {
  validateCommentBody,
  validateCommentId,
  validateCommentPaging,
  validateCommentUpdate,
} from "../../../src/module/articles/validators/comment.validators";

const COMMENT_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";

const errorCode = (result: { value?: unknown; error?: { code: string } }) =>
  "error" in result ? result.error?.code : undefined;

test("validateCommentId rejects malformed identifiers", () => {
  expect(() => validateCommentId(COMMENT_ID)).not.toThrow();
  expect(() => validateCommentId("nope")).toThrow(expect.objectContaining({ code: "INVALID_ID" }));
});

test("validateCommentBody accepts a root comment", () => {
  expect(validateCommentBody({ comment: "Hello" })).toEqual({
    value: { comment: "Hello", parentCommentId: null },
  });
  expect(validateCommentBody({ comment: "Hello", parent_comment: null })).toEqual({
    value: { comment: "Hello", parentCommentId: null },
  });
});

test("validateCommentBody accepts a reply", () => {
  expect(validateCommentBody({ comment: "Hello", parent_comment: COMMENT_ID })).toEqual({
    value: { comment: "Hello", parentCommentId: COMMENT_ID },
  });
});

test("validateCommentBody requires a comment", () => {
  expect(errorCode(validateCommentBody({}))).toBe("MISSING_FIELD");
  expect(errorCode(validateCommentBody({ comment: null }))).toBe("MISSING_FIELD");
  expect(errorCode(validateCommentBody({ comment: "" }))).toBe("MISSING_FIELD");
});

test("validateCommentBody rejects malformed comments", () => {
  expect(errorCode(validateCommentBody({ comment: 5 }))).toBe("INVALID_FIELD");
  expect(errorCode(validateCommentBody({ comment: "a".repeat(1001) }))).toBe("INVALID_FIELD");
});

test("validateCommentBody rejects malformed parents", () => {
  expect(errorCode(validateCommentBody({ comment: "x", parent_comment: 5 }))).toBe("INVALID_FIELD");
  expect(errorCode(validateCommentBody({ comment: "x", parent_comment: "nope" }))).toBe(
    "INVALID_ID",
  );
});

test("validateCommentUpdate accepts a comment", () => {
  expect(validateCommentUpdate({ comment: "Edited" })).toEqual({ value: "Edited" });
});

test("validateCommentUpdate rejects malformed comments", () => {
  expect(errorCode(validateCommentUpdate({}))).toBe("MISSING_FIELD");
  expect(errorCode(validateCommentUpdate({ comment: "" }))).toBe("MISSING_FIELD");
  expect(errorCode(validateCommentUpdate({ comment: 5 }))).toBe("INVALID_FIELD");
  expect(errorCode(validateCommentUpdate({ comment: "a".repeat(1001) }))).toBe("INVALID_FIELD");
});

test("validateCommentPaging applies defaults", () => {
  expect(validateCommentPaging({})).toEqual({ value: { limit: 50, page: 1 } });
});

test("validateCommentPaging accepts overrides", () => {
  expect(validateCommentPaging({ limit: "100", page: "2" })).toEqual({
    value: { limit: 100, page: 2 },
  });
});

test("validateCommentPaging rejects malformed values", () => {
  expect(errorCode(validateCommentPaging({ limit: "0" }))).toBe("INVALID_QUERY_PARAM");
  expect(errorCode(validateCommentPaging({ limit: "101" }))).toBe("INVALID_QUERY_PARAM");
  expect(errorCode(validateCommentPaging({ page: "0" }))).toBe("INVALID_QUERY_PARAM");
  expect(errorCode(validateCommentPaging({ page: "x" }))).toBe("INVALID_QUERY_PARAM");
});
