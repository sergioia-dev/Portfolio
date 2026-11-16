import {
  validateCertificationId,
  validateCreateParts,
  validateListQuery,
  validatePublicCertificationId,
  validateUpdateParts,
  validateUserId,
} from "../../../../src/module/portfolio/certifications/validators/certification.validators";

const CERTIFICATION_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const USER_ID = "6c1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const pdf = Buffer.from("%PDF-1.7\nbody");

const readError = (validation: { error?: { code: string } } | { value: unknown }) => {
  if (!("error" in validation) || !validation.error) {
    throw new Error("expected a validation error");
  }
  return validation.error as { code: string; message: string };
};

test("create parts are trimmed and accepted", () => {
  expect(validateCreateParts({ title: "  React  ", description: "  Advanced  " }, pdf)).toEqual({
    value: { title: "React", description: "Advanced", document: pdf },
  });
});

test("create requires title, description and document", () => {
  expect(readError(validateCreateParts({}, pdf))).toMatchObject({ code: "MISSING_FIELD" });
  expect(readError(validateCreateParts({ title: "React" }, pdf))).toMatchObject({
    code: "MISSING_FIELD",
  });
  expect(
    readError(validateCreateParts({ title: "React", description: "Advanced" }, undefined)),
  ).toMatchObject({ code: "MISSING_FIELD" });
  expect(
    readError(validateCreateParts({ title: "React", description: "Advanced" }, Buffer.alloc(0))),
  ).toMatchObject({ code: "MISSING_FIELD" });
});

test("create treats blank text parts as missing", () => {
  expect(
    readError(validateCreateParts({ title: "   ", description: "Advanced" }, pdf)),
  ).toMatchObject({ code: "MISSING_FIELD" });
  expect(
    readError(validateCreateParts({ title: "React", description: " \n " }, pdf)),
  ).toMatchObject({ code: "MISSING_FIELD" });
});

test("create rejects non-text parts with INVALID_FIELD", () => {
  expect(readError(validateCreateParts({ title: 42, description: "Advanced" }, pdf))).toMatchObject(
    { code: "INVALID_FIELD" },
  );
  expect(readError(validateCreateParts({ title: "React", description: 42 }, pdf))).toMatchObject({
    code: "INVALID_FIELD",
  });
});

test("create rejects a document that is not a PDF", () => {
  expect(
    readError(
      validateCreateParts({ title: "React", description: "Advanced" }, Buffer.from("text")),
    ),
  ).toMatchObject({ code: "INVALID_FORMAT" });
  expect(
    readError(
      validateCreateParts(
        { title: "React", description: "Advanced" },
        Buffer.alloc(10 * 1024 * 1024 + 1),
      ),
    ),
  ).toMatchObject({ code: "INVALID_FORMAT" });
});

test("create rejects titles and descriptions that are too long", () => {
  expect(
    readError(validateCreateParts({ title: "a".repeat(151), description: "Advanced" }, pdf)),
  ).toMatchObject({ code: "INVALID_TITLE" });
  expect(
    readError(validateCreateParts({ title: "React", description: "a".repeat(1001) }, pdf)),
  ).toMatchObject({ code: "INVALID_DESCRIPTION" });
});

test("update requires at least one part", () => {
  expect(readError(validateUpdateParts({}, undefined))).toMatchObject({ code: "MISSING_FIELD" });
  expect(readError(validateUpdateParts({}, Buffer.alloc(0)))).toMatchObject({
    code: "MISSING_FIELD",
  });
});

test("update treats an empty document as absent", () => {
  expect(validateUpdateParts({ title: " React " }, Buffer.alloc(0))).toEqual({
    value: { title: "React", description: null, document: null },
  });
  expect(validateUpdateParts({ description: "Advanced" }, undefined)).toEqual({
    value: { title: null, description: "Advanced", document: null },
  });
  expect(validateUpdateParts({}, pdf)).toEqual({
    value: { title: null, description: null, document: pdf },
  });
});

test("update rejects blank, non-text, invalid and oversized parts", () => {
  expect(readError(validateUpdateParts({ title: " " }, undefined))).toMatchObject({
    code: "MISSING_FIELD",
  });
  expect(readError(validateUpdateParts({ description: " " }, undefined))).toMatchObject({
    code: "MISSING_FIELD",
  });
  expect(readError(validateUpdateParts({ title: [] }, undefined))).toMatchObject({
    code: "INVALID_FIELD",
  });
  expect(readError(validateUpdateParts({ description: [] }, undefined))).toMatchObject({
    code: "INVALID_FIELD",
  });
  expect(readError(validateUpdateParts({}, Buffer.from("text")))).toMatchObject({
    code: "INVALID_FORMAT",
  });
  expect(readError(validateUpdateParts({ title: "a".repeat(151) }, undefined))).toMatchObject({
    code: "INVALID_TITLE",
  });
  expect(
    readError(validateUpdateParts({ description: "a".repeat(1001) }, undefined)),
  ).toMatchObject({ code: "INVALID_DESCRIPTION" });
});

test("ids must be UUIDs and use the documented error codes", () => {
  expect(validateCertificationId(CERTIFICATION_ID)).toEqual({ value: CERTIFICATION_ID });
  expect(readError(validateCertificationId("nope"))).toMatchObject({ code: "INVALID_ID" });
  expect(validateUserId(USER_ID)).toEqual({ value: USER_ID });
  expect(readError(validateUserId("nope"))).toMatchObject({ code: "INVALID_USER_ID" });
  expect(validatePublicCertificationId(CERTIFICATION_ID)).toEqual({ value: CERTIFICATION_ID });
  expect(readError(validatePublicCertificationId("nope"))).toMatchObject({
    code: "INVALID_CERTIFICATION_ID",
  });
});

test("list query defaults to page 1 and limit 20", () => {
  expect(validateListQuery({})).toEqual({ value: { limit: 20, page: 1 } });
  expect(validateListQuery({ page: "3", limit: "5" })).toEqual({
    value: { limit: 5, page: 3 },
  });
});

test("list query rejects values outside its bounds", () => {
  for (const query of [
    { page: "0" },
    { page: "abc" },
    { limit: "0" },
    { limit: "101" },
    { limit: "1.5" },
  ]) {
    expect(readError(validateListQuery(query))).toMatchObject({ code: "INVALID_QUERY_PARAM" });
  }
});
