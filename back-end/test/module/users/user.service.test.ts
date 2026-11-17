import type { DataSource, EntityManager } from "typeorm";
import type { PasswordHasher } from "../../../src/module/auth/service/auth.service";
import type UserRepository from "../../../src/module/users/repository/user.repository";
import UserService from "../../../src/module/users/service/user.service";
import type User from "../../../src/shared/database/user/user.entity";

const USER_ID = "user-id";

const information = {
  fullName: "John Doe",
  phone: "+573001234567",
  country: "Colombia",
  githubUrl: "https://github.com/john",
  gitlabUrl: null,
  linkedinUrl: null,
  businessEmail: "john@company.com",
};

const buildUser = (overrides: Record<string, unknown> = {}) =>
  ({
    id: USER_ID,
    username: "john",
    email: "john@example.com",
    provider: { name: "LOCAL" },
    rol: { name: "VISITOR" },
    information,
    isDeleted: false,
    ...overrides,
  }) as unknown as User;

const expectedResponse = (overrides: Record<string, unknown> = {}) => ({
  id: USER_ID,
  username: "john",
  email: "john@example.com",
  provider: "LOCAL",
  role: "VISITOR",
  information: {
    full_name: "John Doe",
    phone: "+573001234567",
    country: "Colombia",
    github_url: "https://github.com/john",
    gitlab_url: null,
    linkedin_url: null,
    business_email: "john@company.com",
  },
  ...overrides,
});

const createRepository = () => ({
  findById: jest.fn(),
  findByIdWithRelations: jest.fn(),
  findByUsername: jest.fn().mockResolvedValue(null),
  findByEmail: jest.fn().mockResolvedValue(null),
  updateAccount: jest.fn().mockResolvedValue(undefined),
  upsertInformation: jest.fn().mockResolvedValue(undefined),
  softDelete: jest.fn().mockResolvedValue(undefined),
});

const buildService = () => {
  const repository = createRepository();
  const manager = {} as EntityManager;
  const transaction = jest.fn(async (run: (value: EntityManager) => Promise<void>) => run(manager));
  const dataSource = { transaction } as unknown as DataSource;
  const hasher = {
    hash: jest.fn(async (password: string) => `hashed:${password}`),
    compare: jest.fn(),
  };
  const service = new UserService(
    repository as unknown as UserRepository,
    dataSource,
    hasher as unknown as PasswordHasher,
  );
  return { service, repository, transaction, hasher, manager };
};

test("getMe returns the account and its profile", async () => {
  const { service, repository } = buildService();
  repository.findByIdWithRelations.mockResolvedValue(buildUser());

  await expect(service.getMe(USER_ID)).resolves.toEqual(expectedResponse());
  expect(repository.findByIdWithRelations).toHaveBeenCalledWith(USER_ID);
});

test("getMe returns a null profile when no information row exists", async () => {
  const { service, repository } = buildService();
  repository.findByIdWithRelations.mockResolvedValue(buildUser({ information: null }));

  await expect(service.getMe(USER_ID)).resolves.toEqual(expectedResponse({ information: null }));
});

test("getMe rejects a missing or deleted account with 401", async () => {
  const { service, repository } = buildService();

  repository.findByIdWithRelations.mockResolvedValue(null);
  await expect(service.getMe(USER_ID)).rejects.toMatchObject({
    code: "UNAUTHORIZED",
    httpStatus: 401,
  });

  repository.findByIdWithRelations.mockResolvedValue(buildUser({ isDeleted: true }));
  await expect(service.getMe(USER_ID)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});

test("updateMe rejects an invalid body before reading the account", async () => {
  const { service, repository } = buildService();

  await expect(service.updateMe(USER_ID, { username: "bad_name" })).rejects.toMatchObject({
    code: "INVALID_USERNAME",
  });
  expect(repository.findByIdWithRelations).not.toHaveBeenCalled();
});

test("updateMe rejects a missing or deleted account with 401", async () => {
  const { service, repository } = buildService();

  repository.findByIdWithRelations.mockResolvedValue(null);
  await expect(service.updateMe(USER_ID, {})).rejects.toMatchObject({ code: "UNAUTHORIZED" });

  repository.findByIdWithRelations.mockResolvedValue(buildUser({ isDeleted: true }));
  await expect(service.updateMe(USER_ID, {})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});

test("updateMe rejects a password change for a non-local provider", async () => {
  const { service, repository, transaction } = buildService();
  repository.findByIdWithRelations.mockResolvedValue(buildUser({ provider: { name: "GOOGLE" } }));

  await expect(service.updateMe(USER_ID, { password: "Password1!" })).rejects.toMatchObject({
    code: "INVALID_FIELD",
    httpStatus: 400,
  });
  expect(transaction).not.toHaveBeenCalled();
});

test("updateMe rejects a username owned by another account", async () => {
  const { service, repository, transaction } = buildService();
  repository.findByIdWithRelations.mockResolvedValue(buildUser());
  repository.findByUsername.mockResolvedValue({ id: "other-id" });

  await expect(service.updateMe(USER_ID, { username: "other" })).rejects.toMatchObject({
    code: "MSG-1",
    httpStatus: 409,
  });
  expect(transaction).not.toHaveBeenCalled();
});

test("updateMe rejects an email owned by another account", async () => {
  const { service, repository } = buildService();
  repository.findByIdWithRelations.mockResolvedValue(buildUser());
  repository.findByEmail.mockResolvedValue({ id: "other-id" });

  await expect(service.updateMe(USER_ID, { email: "other@example.com" })).rejects.toMatchObject({
    code: "MSG-2",
    httpStatus: 409,
  });
});

test("updateMe allows keeping the same username and email", async () => {
  const { service, repository } = buildService();
  repository.findByIdWithRelations
    .mockResolvedValueOnce(buildUser())
    .mockResolvedValueOnce(buildUser());
  repository.findByUsername.mockResolvedValue({ id: USER_ID });
  repository.findByEmail.mockResolvedValue({ id: USER_ID });

  await expect(
    service.updateMe(USER_ID, { username: "john", email: "john@example.com" }),
  ).resolves.toEqual(expectedResponse());
  expect(repository.updateAccount).toHaveBeenCalledWith(
    USER_ID,
    { username: "john", email: "john@example.com" },
    expect.anything(),
  );
});

test("updateMe hashes the password and updates the profile in one transaction", async () => {
  const { service, repository, transaction, hasher, manager } = buildService();
  const updated = buildUser({
    username: "john-doe",
    information: { ...information, country: "Peru" },
  });
  repository.findByIdWithRelations
    .mockResolvedValueOnce(buildUser())
    .mockResolvedValueOnce(updated);

  await expect(
    service.updateMe(USER_ID, {
      username: "john-doe",
      password: "Password1!",
      information: { country: "Peru" },
    }),
  ).resolves.toEqual(
    expectedResponse({
      username: "john-doe",
      information: {
        ...expectedResponse().information,
        country: "Peru",
      },
    }),
  );

  expect(hasher.hash).toHaveBeenCalledWith("Password1!");
  expect(transaction).toHaveBeenCalledTimes(1);
  expect(repository.updateAccount).toHaveBeenCalledWith(
    USER_ID,
    { username: "john-doe", password: "hashed:Password1!" },
    manager,
  );
  expect(repository.upsertInformation).toHaveBeenCalledWith(USER_ID, { country: "Peru" }, manager);
});

test("updateMe can update only the profile", async () => {
  const { service, repository, manager } = buildService();
  repository.findByIdWithRelations
    .mockResolvedValueOnce(buildUser())
    .mockResolvedValueOnce(buildUser({ information: null }));

  await service.updateMe(USER_ID, { information: { phone: null } });

  expect(repository.updateAccount).toHaveBeenCalledWith(USER_ID, {}, manager);
  expect(repository.upsertInformation).toHaveBeenCalledWith(USER_ID, { phone: null }, manager);
});

test("updateMe maps a unique violation to the field error", async () => {
  const { service, repository, transaction } = buildService();
  repository.findByIdWithRelations.mockResolvedValue(buildUser());

  transaction.mockRejectedValueOnce({
    code: "23505",
    detail: "Key (username)=(john) already exists.",
  });
  await expect(service.updateMe(USER_ID, { username: "john" })).rejects.toMatchObject({
    code: "MSG-1",
  });

  transaction.mockRejectedValueOnce({
    code: "23505",
    detail: "Key (email)=(john@example.com) already exists.",
  });
  await expect(service.updateMe(USER_ID, { email: "john@example.com" })).rejects.toMatchObject({
    code: "MSG-2",
  });
});

test("updateMe rethrows unexpected transaction errors", async () => {
  const { service, repository, transaction } = buildService();
  repository.findByIdWithRelations.mockResolvedValue(buildUser());
  transaction.mockRejectedValueOnce(new Error("database down"));

  await expect(service.updateMe(USER_ID, { username: "john" })).rejects.toThrow("database down");
});

test("updateMe rejects when the account disappears after the update", async () => {
  const { service, repository } = buildService();
  repository.findByIdWithRelations.mockResolvedValueOnce(buildUser()).mockResolvedValueOnce(null);

  await expect(service.updateMe(USER_ID, { username: "john" })).rejects.toMatchObject({
    code: "UNAUTHORIZED",
  });
});

test("deleteMe soft-deletes the account", async () => {
  const { service, repository } = buildService();

  await service.deleteMe(USER_ID);

  expect(repository.softDelete).toHaveBeenCalledWith(USER_ID);
});
