import type AdministrationRepository from "../../../src/module/administration/repository/administration.repository";
import AdministrationService, {
  isAdministrator,
} from "../../../src/module/administration/service/administration.service";

const USER_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const OTHER_ID = "9b1e3a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";

const user = (overrides: Record<string, unknown> = {}) => ({
  id: USER_ID,
  username: "sergio-dev",
  email: "sergio@example.com",
  isDeleted: false,
  deletedAt: null,
  rol: { name: "VISITOR", functionalities: [] },
  ...overrides,
});

const administrator = (overrides: Record<string, unknown> = {}) =>
  user({
    rol: {
      name: "ADMIN",
      functionalities: [{ id: "feature-id", name: "ADMINISTRATOR" }],
    },
    ...overrides,
  });

const createRepository = () => ({
  searchUsers: jest.fn().mockResolvedValue({ items: [user()], total: 1 }),
  findByIdWithRoleAndFeatures: jest.fn().mockResolvedValue(user()),
  findByUsername: jest.fn().mockResolvedValue(null),
  findByEmail: jest.fn().mockResolvedValue(null),
  updateAccount: jest.fn().mockResolvedValue(undefined),
  softDelete: jest.fn().mockResolvedValue(undefined),
});

const buildService = () => {
  const repository = createRepository();
  return {
    service: new AdministrationService(repository as unknown as AdministrationRepository),
    repository,
  };
};

test("search returns the page and echoes the query metadata", async () => {
  const { service, repository } = buildService();

  await expect(service.search({ query: " sergio ", page: "2", limit: "5" })).resolves.toEqual({
    items: [user()],
    query: "sergio",
    page: 2,
    limit: 5,
    total: 1,
  });
  expect(repository.searchUsers).toHaveBeenCalledWith({
    query: "sergio",
    includeDeleted: false,
    page: 2,
    limit: 5,
  });
});

test("search surfaces validation errors", async () => {
  const { service, repository } = buildService();

  await expect(service.search({})).rejects.toMatchObject({ code: "MISSING_FIELD" });
  expect(repository.searchUsers).not.toHaveBeenCalled();
});

test("isAdministrator detects the feature on the role", () => {
  expect(isAdministrator(user() as never)).toBe(false);
  expect(isAdministrator(administrator() as never)).toBe(true);
});

test("update applies the changes and returns the refreshed user", async () => {
  const { service, repository } = buildService();
  const updated = user({ username: "updated-name" });
  repository.findByIdWithRoleAndFeatures
    .mockResolvedValueOnce(user())
    .mockResolvedValueOnce(updated);

  await expect(service.update(USER_ID, { username: "updated-name" })).resolves.toBe(updated);
  expect(repository.updateAccount).toHaveBeenCalledWith(USER_ID, { username: "updated-name" });
});

test("update rejects a malformed id before loading the target", async () => {
  const { service, repository } = buildService();

  await expect(service.update("not-a-uuid", { username: "updated-name" })).rejects.toMatchObject({
    code: "INVALID_USER_ID",
  });
  expect(repository.findByIdWithRoleAndFeatures).not.toHaveBeenCalled();
});

test("update rejects a missing or soft-deleted target", async () => {
  const { service, repository } = buildService();
  repository.findByIdWithRoleAndFeatures.mockResolvedValueOnce(null);
  await expect(service.update(USER_ID, { username: "updated-name" })).rejects.toMatchObject({
    code: "MSG-4",
  });

  repository.findByIdWithRoleAndFeatures.mockResolvedValueOnce(user({ isDeleted: true }));
  await expect(service.update(USER_ID, { username: "updated-name" })).rejects.toMatchObject({
    code: "MSG-4",
  });

  repository.findByIdWithRoleAndFeatures.mockResolvedValueOnce(
    user({ deletedAt: new Date("2026-01-01T00:00:00.000Z") }),
  );
  await expect(service.update(USER_ID, { username: "updated-name" })).rejects.toMatchObject({
    code: "MSG-4",
  });
});

test("update rejects an administrator target, including the caller", async () => {
  const { service, repository } = buildService();
  repository.findByIdWithRoleAndFeatures.mockResolvedValueOnce(administrator());

  await expect(service.update(USER_ID, { username: "updated-name" })).rejects.toMatchObject({
    code: "MSG-5",
    httpStatus: 403,
  });
  expect(repository.updateAccount).not.toHaveBeenCalled();
});

test("update surfaces body validation errors", async () => {
  const { service, repository } = buildService();

  await expect(service.update(USER_ID, {})).rejects.toMatchObject({ code: "INVALID_FIELD" });
  expect(repository.updateAccount).not.toHaveBeenCalled();
});

test("update rejects a username or email owned by another account", async () => {
  const { service, repository } = buildService();
  repository.findByUsername.mockResolvedValueOnce(user({ id: OTHER_ID }));
  await expect(service.update(USER_ID, { username: "taken" })).rejects.toMatchObject({
    code: "MSG-1",
  });

  repository.findByEmail.mockResolvedValueOnce(user({ id: OTHER_ID }));
  await expect(service.update(USER_ID, { email: "taken@example.com" })).rejects.toMatchObject({
    code: "MSG-2",
  });
  expect(repository.updateAccount).not.toHaveBeenCalled();
});

test("update allows keeping the target's own username and email", async () => {
  const { service, repository } = buildService();
  repository.findByUsername.mockResolvedValueOnce(user());
  repository.findByEmail.mockResolvedValueOnce(user());

  await expect(
    service.update(USER_ID, { username: "sergio-dev", email: "sergio@example.com" }),
  ).resolves.toMatchObject({ id: USER_ID });
  expect(repository.updateAccount).toHaveBeenCalledWith(USER_ID, {
    username: "sergio-dev",
    email: "sergio@example.com",
  });
});

test("update maps unique constraint violations to the friendly codes", async () => {
  const { service, repository } = buildService();
  repository.updateAccount.mockRejectedValueOnce({
    code: "23505",
    detail: "Key (username)=(taken) already exists.",
  });
  await expect(service.update(USER_ID, { username: "taken" })).rejects.toMatchObject({
    code: "MSG-1",
  });

  repository.updateAccount.mockRejectedValueOnce({
    code: "23505",
    detail: "Key (email)=(username@example.com) already exists.",
  });
  await expect(service.update(USER_ID, { email: "username@example.com" })).rejects.toMatchObject({
    code: "MSG-2",
  });
});

test("update rethrows unrelated persistence errors", async () => {
  const { service, repository } = buildService();
  const failure = new Error("database down");
  repository.updateAccount.mockRejectedValueOnce(failure);

  await expect(service.update(USER_ID, { username: "updated-name" })).rejects.toBe(failure);
});

test("update reports MSG-4 when the refreshed user disappears", async () => {
  const { service, repository } = buildService();
  repository.findByIdWithRoleAndFeatures.mockResolvedValueOnce(user()).mockResolvedValueOnce(null);

  await expect(service.update(USER_ID, { username: "updated-name" })).rejects.toMatchObject({
    code: "MSG-4",
  });
});

test("softDelete marks a regular user as deleted", async () => {
  const { service, repository } = buildService();

  await expect(service.softDelete(USER_ID)).resolves.toBeUndefined();
  expect(repository.softDelete).toHaveBeenCalledWith(USER_ID);
});

test("softDelete is idempotent for an already deleted user", async () => {
  const { service, repository } = buildService();
  repository.findByIdWithRoleAndFeatures.mockResolvedValueOnce(user({ isDeleted: true }));

  await expect(service.softDelete(USER_ID)).resolves.toBeUndefined();
  expect(repository.softDelete).not.toHaveBeenCalled();

  repository.findByIdWithRoleAndFeatures.mockResolvedValueOnce(
    user({ deletedAt: new Date("2026-01-01T00:00:00.000Z") }),
  );
  await expect(service.softDelete(USER_ID)).resolves.toBeUndefined();
  expect(repository.softDelete).not.toHaveBeenCalled();
});

test("softDelete rejects a missing target", async () => {
  const { service, repository } = buildService();
  repository.findByIdWithRoleAndFeatures.mockResolvedValueOnce(null);

  await expect(service.softDelete(USER_ID)).rejects.toMatchObject({ code: "MSG-4" });
});

test("softDelete rejects an administrator target", async () => {
  const { service, repository } = buildService();
  repository.findByIdWithRoleAndFeatures.mockResolvedValueOnce(administrator());

  await expect(service.softDelete(USER_ID)).rejects.toMatchObject({ code: "MSG-5" });
  expect(repository.softDelete).not.toHaveBeenCalled();
});

test("softDelete rejects a malformed id", async () => {
  const { service } = buildService();

  await expect(service.softDelete("not-a-uuid")).rejects.toMatchObject({
    code: "INVALID_USER_ID",
  });
});
