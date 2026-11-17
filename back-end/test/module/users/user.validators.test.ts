import { validateUpdateMe } from "../../../src/module/users/validators/user.validators";

const expectCode = (body: unknown, code: string) => {
  const result = validateUpdateMe(body);
  expect("error" in result && result.error.code).toBe(code);
};

test("accepts a complete update and maps information to camelCase", () => {
  const result = validateUpdateMe({
    username: "john-doe",
    email: "john@example.com",
    password: "Password1!",
    information: {
      full_name: "John Doe",
      phone: "+573001234567",
      country: "Colombia",
      github_url: "https://github.com/john",
      gitlab_url: "https://gitlab.com/john",
      linkedin_url: "https://linkedin.com/in/john",
      business_email: "john@company.com",
    },
  });

  expect(result).toEqual({
    value: {
      username: "john-doe",
      email: "john@example.com",
      password: "Password1!",
      information: {
        fullName: "John Doe",
        phone: "+573001234567",
        country: "Colombia",
        githubUrl: "https://github.com/john",
        gitlabUrl: "https://gitlab.com/john",
        linkedinUrl: "https://linkedin.com/in/john",
        businessEmail: "john@company.com",
      },
    },
  });
});

test("accepts null to clear nullable information fields", () => {
  const result = validateUpdateMe({
    information: {
      full_name: null,
      phone: null,
      country: null,
      github_url: null,
      gitlab_url: null,
      linkedin_url: null,
      business_email: null,
    },
  });

  expect(result).toEqual({
    value: {
      information: {
        fullName: null,
        phone: null,
        country: null,
        githubUrl: null,
        gitlabUrl: null,
        linkedinUrl: null,
        businessEmail: null,
      },
    },
  });
});

test("accepts an empty body without changes", () => {
  expect(validateUpdateMe({})).toEqual({ value: {} });
});

test("rejects a body that is not an object", () => {
  expectCode(null, "INVALID_FIELD");
  expectCode([], "INVALID_FIELD");
  expectCode("body", "INVALID_FIELD");
});

test("rejects an information value that is not an object", () => {
  expectCode({ information: null }, "INVALID_FIELD");
  expectCode({ information: "profile" }, "INVALID_FIELD");
  expectCode({ information: [] }, "INVALID_FIELD");
});

test("rejects information fields with the wrong JSON type", () => {
  expectCode({ information: { full_name: 7 } }, "INVALID_FIELD");
  expectCode({ information: { phone: true } }, "INVALID_FIELD");
  expectCode({ information: { country: {} } }, "INVALID_FIELD");
  expectCode({ information: { github_url: 1 } }, "INVALID_FIELD");
  expectCode({ information: { gitlab_url: 1 } }, "INVALID_FIELD");
  expectCode({ information: { linkedin_url: 1 } }, "INVALID_FIELD");
  expectCode({ information: { business_email: 1 } }, "INVALID_FIELD");
});

test("rejects information fields that exceed their column length", () => {
  expectCode({ information: { full_name: "a".repeat(256) } }, "INVALID_FIELD");
  expectCode({ information: { country: "a".repeat(51) } }, "INVALID_FIELD");
});

test("rejects a blank country", () => {
  expectCode({ information: { country: "   " } }, "INVALID_FIELD");
});

test("rejects invalid usernames", () => {
  expectCode({ username: "" }, "INVALID_USERNAME");
  expectCode({ username: "a".repeat(40) }, "INVALID_USERNAME");
  expectCode({ username: "john_doe" }, "INVALID_USERNAME");
  expectCode({ username: "-john" }, "INVALID_USERNAME");
  expectCode({ username: "john--doe" }, "INVALID_USERNAME");
  expectCode({ username: 7 }, "INVALID_USERNAME");
});

test("rejects invalid account and business emails", () => {
  expectCode({ email: "not-an-email" }, "INVALID_EMAIL");
  expectCode({ email: `${"a".repeat(320)}@example.com` }, "INVALID_EMAIL");
  expectCode({ email: 7 }, "INVALID_EMAIL");
  expectCode({ information: { business_email: "not-an-email" } }, "INVALID_EMAIL");
  expectCode(
    { information: { business_email: `${"a".repeat(320)}@example.com` } },
    "INVALID_EMAIL",
  );
});

test("rejects weak passwords", () => {
  expectCode({ password: "short1!" }, "MSG-3");
  expectCode({ password: "password1!" }, "MSG-3");
  expectCode({ password: "Password!!" }, "MSG-3");
  expectCode({ password: "Password11" }, "MSG-3");
  expectCode({ password: 7 }, "MSG-3");
});

test("rejects blank names and names with control characters", () => {
  expectCode({ information: { full_name: "   " } }, "INVALID_NAME");
  expectCode({ information: { full_name: "John\u0000Doe" } }, "INVALID_NAME");
});

test("rejects phone values with an invalid format", () => {
  expectCode({ information: { phone: "not-a-phone" } }, "INVALID_FORMAT");
  expectCode({ information: { phone: "+123456789012345678" } }, "INVALID_FORMAT");
});

test("rejects urls that are not absolute or are too long", () => {
  expectCode({ information: { github_url: "/john" } }, "INVALID_URL");
  expectCode({ information: { gitlab_url: "not a url" } }, "INVALID_URL");
  expectCode(
    { information: { linkedin_url: `https://linkedin.com/in/${"a".repeat(2048)}` } },
    "INVALID_URL",
  );
});

test("reports invalid fields before field-specific errors", () => {
  expectCode({ username: "bad_name", information: { full_name: 7 } }, "INVALID_FIELD");
  expectCode({ username: "bad_name", email: "bad" }, "INVALID_USERNAME");
  expectCode({ email: "bad", password: "weak" }, "INVALID_EMAIL");
  expectCode({ password: "weak", information: { full_name: " " } }, "MSG-3");
});

test("only includes provided fields in the value", () => {
  expect(validateUpdateMe({ username: "john" })).toEqual({ value: { username: "john" } });
  expect(validateUpdateMe({ information: { phone: null } })).toEqual({
    value: { information: { phone: null } },
  });
});
