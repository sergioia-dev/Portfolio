import {
  invalidEmail,
  invalidField,
  invalidFormat,
  invalidName,
  invalidPassword,
  invalidUrl,
  invalidUsername,
  type UserError,
} from "../errors/user.errors";

export interface InformationInput {
  fullName?: string | null;
  phone?: string | null;
  country?: string | null;
  githubUrl?: string | null;
  gitlabUrl?: string | null;
  linkedinUrl?: string | null;
  businessEmail?: string | null;
}

export interface UpdateMeInput {
  username?: string;
  email?: string;
  password?: string;
  information?: InformationInput;
}

type Validation = { value: UpdateMeInput } | { error: UserError };

const USERNAME_PATTERN = /^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_SPECIAL_PATTERN = /[@!&_-]/;
const CONTROL_CHARACTER_PATTERN = /[\p{Cc}]/u;
const PHONE_PATTERN = /^\+?[0-9]{6,17}$/;

const USERNAME_MAX_LENGTH = 39;
const FULL_NAME_MAX_LENGTH = 255;
const COUNTRY_MAX_LENGTH = 50;
const PHONE_MAX_LENGTH = 17;
const EMAIL_MAX_LENGTH = 320;
const URL_MAX_LENGTH = 2048;

const readRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const isValidPassword = (value: string): boolean =>
  value.length >= 8 &&
  /[A-Z]/.test(value) &&
  /[a-z]/.test(value) &&
  /[0-9]/.test(value) &&
  PASSWORD_SPECIAL_PATTERN.test(value);

const isAbsoluteUrl = (value: string): boolean => {
  try {
    return new URL(value).hostname !== "";
  } catch {
    return false;
  }
};

const readInformation = (value: unknown): InformationInput | UserError => {
  if (value === undefined) return {};
  const record = readRecord(value);
  if (!record) return invalidField("information");

  const fields: InformationInput = {};
  const names: [keyof InformationInput, string][] = [
    ["fullName", "full_name"],
    ["phone", "phone"],
    ["country", "country"],
    ["githubUrl", "github_url"],
    ["gitlabUrl", "gitlab_url"],
    ["linkedinUrl", "linkedin_url"],
    ["businessEmail", "business_email"],
  ];

  for (const [key, name] of names) {
    const field = record[name];
    if (field === undefined) continue;
    if (field !== null && typeof field !== "string") return invalidField(name);
    fields[key] = field;
  }

  if (typeof fields.fullName === "string" && fields.fullName.length > FULL_NAME_MAX_LENGTH) {
    return invalidField("full_name");
  }
  if (typeof fields.country === "string") {
    if (fields.country.length > COUNTRY_MAX_LENGTH) return invalidField("country");
    if (fields.country.trim() === "") return invalidField("country");
  }

  return fields;
};

export const validateUpdateMe = (body: unknown): Validation => {
  const record = readRecord(body);
  if (!record) return { error: invalidField("body") };

  const information = readInformation(record.information);
  if (information instanceof Error) return { error: information };

  if (record.username !== undefined) {
    if (
      typeof record.username !== "string" ||
      record.username.length > USERNAME_MAX_LENGTH ||
      !USERNAME_PATTERN.test(record.username)
    ) {
      return { error: invalidUsername() };
    }
  }

  if (record.email !== undefined) {
    if (
      typeof record.email !== "string" ||
      record.email.length > EMAIL_MAX_LENGTH ||
      !EMAIL_PATTERN.test(record.email)
    ) {
      return { error: invalidEmail() };
    }
  }

  if (
    typeof information.businessEmail === "string" &&
    (information.businessEmail.length > EMAIL_MAX_LENGTH ||
      !EMAIL_PATTERN.test(information.businessEmail))
  ) {
    return { error: invalidEmail() };
  }

  if (record.password !== undefined) {
    if (typeof record.password !== "string" || !isValidPassword(record.password)) {
      return { error: invalidPassword() };
    }
  }

  if (
    typeof information.fullName === "string" &&
    (information.fullName.trim() === "" || CONTROL_CHARACTER_PATTERN.test(information.fullName))
  ) {
    return { error: invalidName() };
  }

  if (
    typeof information.phone === "string" &&
    (information.phone.length > PHONE_MAX_LENGTH || !PHONE_PATTERN.test(information.phone))
  ) {
    return { error: invalidFormat() };
  }

  const urls = [information.githubUrl, information.gitlabUrl, information.linkedinUrl];
  for (const url of urls) {
    if (typeof url !== "string") continue;
    if (url.length > URL_MAX_LENGTH || !isAbsoluteUrl(url)) return { error: invalidUrl() };
  }

  const value: UpdateMeInput = {};
  if (typeof record.username === "string") value.username = record.username;
  if (typeof record.email === "string") value.email = record.email;
  if (typeof record.password === "string") value.password = record.password;
  if (record.information !== undefined) value.information = information;

  return { value };
};
