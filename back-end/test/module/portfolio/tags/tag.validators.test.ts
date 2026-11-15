import {
  isSvg,
  validateFilterable,
  validateImage,
  validateListQuery,
  validateRemoveImage,
  validateTagId,
  validateTagName,
} from "../../../../src/module/portfolio/tags/validators/tag.validators";

const TAG_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";

const readError = (validation: { error?: { code: string } } | { value: unknown }) => {
  if (!("error" in validation) || !validation.error) {
    throw new Error("expected a validation error");
  }
  return validation.error as { code: string; message: string };
};

test("a name is trimmed and accepted", () => {
  expect(validateTagName({ name: "  React  " })).toEqual({ value: "React" });
});

test("a missing name is rejected with MISSING_FIELD", () => {
  expect(readError(validateTagName({}))).toMatchObject({ code: "MISSING_FIELD" });
  expect(readError(validateTagName({ name: null }))).toMatchObject({ code: "MISSING_FIELD" });
  expect(readError(validateTagName("not an object"))).toMatchObject({ code: "MISSING_FIELD" });
});

test("an invalid name is rejected with INVALID_NAME", () => {
  for (const name of [42, "", "   ", "a".repeat(51), "bad\u0000name", "bad\nname"]) {
    expect(readError(validateTagName({ name }))).toMatchObject({ code: "INVALID_NAME" });
  }
});

test("filterable defaults to true and only accepts literal booleans", () => {
  expect(validateFilterable({})).toEqual({ value: true });
  expect(validateFilterable({ filterable: "true" })).toEqual({ value: true });
  expect(validateFilterable({ filterable: "false" })).toEqual({ value: false });
  expect(readError(validateFilterable({ filterable: "yes" }))).toMatchObject({
    code: "INVALID_FIELD",
  });
});

test("filterable is required on update", () => {
  expect(readError(validateFilterable({}, true))).toMatchObject({ code: "MISSING_FIELD" });
  expect(validateFilterable({ filterable: "false" }, true)).toEqual({ value: false });
});

test("remove_image defaults to false and validates its value", () => {
  expect(validateRemoveImage({})).toEqual({ value: false });
  expect(validateRemoveImage({ remove_image: "true" })).toEqual({ value: true });
  expect(validateRemoveImage({ remove_image: "false" })).toEqual({ value: false });
  expect(readError(validateRemoveImage({ remove_image: "1" }))).toMatchObject({
    code: "INVALID_FIELD",
  });
});

test("ids must be UUIDs", () => {
  expect(validateTagId(TAG_ID)).toEqual({ value: TAG_ID });
  expect(readError(validateTagId("not-a-uuid"))).toMatchObject({ code: "INVALID_ID" });
  expect(readError(validateTagId("not-a-uuid", "user")).message).toContain("user");
});

test("list query defaults", () => {
  expect(validateListQuery(undefined)).toEqual({
    value: { filterable: null, limit: 20, page: 1 },
  });
});

test("list query parses filterable, limit and page", () => {
  expect(validateListQuery({ filterable: "false", limit: "5", page: "2" })).toEqual({
    value: { filterable: false, limit: 5, page: 2 },
  });
});

test("list query rejects invalid values", () => {
  for (const query of [
    { limit: "0" },
    { limit: "101" },
    { limit: "ten" },
    { page: "0" },
    { page: "1.5" },
    { filterable: "all" },
  ]) {
    expect(readError(validateListQuery(query))).toMatchObject({ code: "INVALID_QUERY_PARAM" });
  }
});

test("SVG detection accepts svg roots and xml prologs only", () => {
  expect(isSvg(Buffer.from("<svg></svg>"))).toBe(true);
  expect(isSvg(Buffer.from("\uFEFF  <svg></svg>"))).toBe(true);
  expect(isSvg(Buffer.from('<?xml version="1.0"?><svg></svg>'))).toBe(true);
  expect(isSvg(Buffer.from("<html></html>"))).toBe(false);
  expect(isSvg(Buffer.from('<?xml version="1.0"?><html></html>'))).toBe(false);
});

test("images must be non-empty SVGs within size", () => {
  const svg = Buffer.from("<svg></svg>");
  expect(validateImage(undefined)).toEqual({ value: null });
  expect(validateImage(svg)).toEqual({ value: svg });
  expect(readError(validateImage(Buffer.alloc(0)))).toMatchObject({ code: "INVALID_IMAGE" });
  expect(readError(validateImage(Buffer.from("<html></html>")))).toMatchObject({
    code: "INVALID_IMAGE",
  });
  expect(readError(validateImage(Buffer.alloc(256 * 1024 + 1, 1)))).toMatchObject({
    code: "INVALID_IMAGE",
  });
});
