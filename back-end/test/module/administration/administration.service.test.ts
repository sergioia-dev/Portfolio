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

const functionality = (overrides: Record<string, unknown> = {}) => ({
  id: OTHER_ID,
  name: "BLOG_EDITOR",
  description: "Edits blogs",
  ...overrides,
});

const role = (overrides: Record<string, unknown> = {}) => ({
  id: OTHER_ID,
  name: "EDITOR",
  description: "Content editors",
  functionalities: [functionality()],
  ...overrides,
});

const administratorRole = () =>
  role({
    name: "ADMIN",
    functionalities: [functionality({ id: "feature-id", name: "ADMINISTRATOR" })],
  });

const createRepository = () => ({
  searchUsers: jest.fn().mockResolvedValue({ items: [user()], total: 1 }),
  findByIdWithRoleAndFeatures: jest.fn().mockResolvedValue(user()),
  findByUsername: jest.fn().mockResolvedValue(null),
  findByEmail: jest.fn().mockResolvedValue(null),
  updateAccount: jest.fn().mockResolvedValue(undefined),
  softDelete: jest.fn().mockResolvedValue(undefined),
  listRoles: jest.fn().mockResolvedValue([role()]),
  listFunctionalitiesExcludingAdministrator: jest.fn().mockResolvedValue([functionality()]),
  findRoleById: jest.fn().mockResolvedValue(role()),
  findFunctionalities: jest.fn().mockResolvedValue([functionality()]),
  countUsersByRole: jest.fn().mockResolvedValue(0),
  createRole: jest.fn().mockResolvedValue(undefined),
  updateRole: jest.fn().mockResolvedValue(undefined),
  deleteRole: jest.fn().mockResolvedValue(undefined),
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

test("update assigns a non-administrator role to the target", async () => {
  const { service, repository } = buildService();

  await expect(service.update(USER_ID, { rol_id: OTHER_ID })).resolves.toMatchObject({
    id: USER_ID,
  });
  expect(repository.findRoleById).toHaveBeenCalledWith(OTHER_ID);
  expect(repository.updateAccount).toHaveBeenCalledWith(USER_ID, { rolId: OTHER_ID });
});

test("update rejects a missing or administrator role", async () => {
  const { service, repository } = buildService();

  repository.findRoleById.mockResolvedValueOnce(null);
  await expect(service.update(USER_ID, { rol_id: OTHER_ID })).rejects.toMatchObject({
    code: "MSG-10",
    httpStatus: 404,
  });

  repository.findRoleById.mockResolvedValueOnce(administratorRole());
  await expect(service.update(USER_ID, { rol_id: OTHER_ID })).rejects.toMatchObject({
    code: "MSG-5",
    httpStatus: 403,
  });
  expect(repository.updateAccount).not.toHaveBeenCalled();
});

test("listRoles and listFunctionalities delegate to the repository", async () => {
  const { service, repository } = buildService();

  await expect(service.listRoles()).resolves.toEqual([role()]);
  await expect(service.listFunctionalities()).resolves.toEqual([functionality()]);
  expect(repository.listFunctionalitiesExcludingAdministrator).toHaveBeenCalledTimes(1);
});

test("createRole stores the role and returns the reloaded row", async () => {
  const { service, repository } = buildService();

  await expect(
    service.createRole({
      name: " EDITOR ",
      description: " Content editors ",
      functionality_ids: [OTHER_ID],
    }),
  ).resolves.toEqual(role());
  expect(repository.findFunctionalities).toHaveBeenCalledWith([OTHER_ID]);
  expect(repository.createRole).toHaveBeenCalledWith({
    id: expect.any(String),
    name: "EDITOR",
    description: "Content editors",
    functionalityIds: [OTHER_ID],
  });
  expect(repository.findRoleById).toHaveBeenCalledWith(expect.any(String));
});

test("createRole accepts a role without functionalities", async () => {
  const { service, repository } = buildService();

  await expect(
    service.createRole({ name: "EDITOR", description: "Content editors" }),
  ).resolves.toEqual(role());
  expect(repository.findFunctionalities).not.toHaveBeenCalled();
  expect(repository.createRole).toHaveBeenCalledWith(
    expect.objectContaining({ functionalityIds: [] }),
  );
});

test("createRole rejects unknown functionalities before writing", async () => {
  const { service, repository } = buildService();
  repository.findFunctionalities.mockResolvedValueOnce([]);

  await expect(
    service.createRole({
      name: "EDITOR",
      description: "Content editors",
      functionality_ids: [OTHER_ID],
    }),
  ).rejects.toMatchObject({ code: "MSG-10", httpStatus: 404 });
  expect(repository.createRole).not.toHaveBeenCalled();
});

test("createRole maps a duplicate name and rethrows unrelated failures", async () => {
  const { service, repository } = buildService();
  repository.createRole.mockRejectedValueOnce({
    code: "23505",
    detail: "Key (name)=(EDITOR) already exists.",
  });
  await expect(
    service.createRole({ name: "EDITOR", description: "Content editors" }),
  ).rejects.toMatchObject({ code: "MSG-13", httpStatus: 409 });

  const failure = new Error("database down");
  repository.createRole.mockRejectedValueOnce(failure);
  await expect(service.createRole({ name: "EDITOR", description: "Content editors" })).rejects.toBe(
    failure,
  );
});

test("createRole reports MSG-10 when the created row disappears", async () => {
  const { service, repository } = buildService();
  repository.findRoleById.mockResolvedValueOnce(null);

  await expect(
    service.createRole({ name: "EDITOR", description: "Content editors" }),
  ).rejects.toMatchObject({
    code: "MSG-10",
  });
});

test("updateRole replaces the name, description and functionalities", async () => {
  const { service, repository } = buildService();

  await expect(
    service.updateRole(
      OTHER_ID,
      { name: "REVIEWER", description: "Reviews content", functionality_ids: [OTHER_ID] },
      USER_ID,
    ),
  ).resolves.toEqual(role());
  expect(repository.updateRole).toHaveBeenCalledWith(OTHER_ID, {
    name: "REVIEWER",
    description: "Reviews content",
    functionalityIds: [OTHER_ID],
  });
});

test("updateRole validates the id, the target and the functionalities", async () => {
  const { service, repository } = buildService();

  await expect(
    service.updateRole(
      "not-a-uuid",
      { name: "REVIEWER", description: "Reviews", functionality_ids: [] },
      USER_ID,
    ),
  ).rejects.toMatchObject({ code: "INVALID_ID" });

  repository.findRoleById.mockResolvedValueOnce(null);
  await expect(
    service.updateRole(
      OTHER_ID,
      { name: "REVIEWER", description: "Reviews", functionality_ids: [] },
      USER_ID,
    ),
  ).rejects.toMatchObject({ code: "MSG-10" });

  repository.findFunctionalities.mockResolvedValueOnce([]);
  await expect(
    service.updateRole(
      OTHER_ID,
      { name: "REVIEWER", description: "Reviews", functionality_ids: [USER_ID] },
      USER_ID,
    ),
  ).rejects.toMatchObject({ code: "MSG-10" });
  expect(repository.updateRole).not.toHaveBeenCalled();
});

test("updateRole blocks detaching ADMINISTRATOR from the caller's own role", async () => {
  const { service, repository } = buildService();
  repository.findRoleById.mockResolvedValueOnce(administratorRole());
  repository.findByIdWithRoleAndFeatures.mockResolvedValueOnce(
    user({ rol: { id: OTHER_ID, name: "ADMIN", functionalities: [] } }),
  );

  await expect(
    service.updateRole(
      OTHER_ID,
      { name: "ADMIN", description: "Admins", functionality_ids: [] },
      USER_ID,
    ),
  ).rejects.toMatchObject({ code: "MSG-5", httpStatus: 403 });
  expect(repository.updateRole).not.toHaveBeenCalled();
});

test("updateRole allows detaching ADMINISTRATOR from another role", async () => {
  const { service, repository } = buildService();
  repository.findRoleById.mockResolvedValueOnce(administratorRole());
  repository.findByIdWithRoleAndFeatures.mockResolvedValueOnce(
    user({ rol: { id: USER_ID, name: "ADMIN", functionalities: [] } }),
  );

  await expect(
    service.updateRole(
      OTHER_ID,
      { name: "ADMIN", description: "Admins", functionality_ids: [] },
      USER_ID,
    ),
  ).resolves.toEqual(role());
  expect(repository.updateRole).toHaveBeenCalledWith(OTHER_ID, {
    name: "ADMIN",
    description: "Admins",
    functionalityIds: [],
  });
});

test("updateRole keeps ADMINISTRATOR when the new functionalities include it", async () => {
  const { service, repository } = buildService();
  repository.findRoleById.mockResolvedValueOnce(administratorRole());

  await expect(
    service.updateRole(
      OTHER_ID,
      {
        name: "ADMIN",
        description: "Admins",
        functionality_ids: ["3c2d1e0f-4a5b-4c6d-8e9f-0a1b2c3d4e5f"],
      },
      USER_ID,
    ),
  ).resolves.toEqual(role());
  expect(repository.updateRole).toHaveBeenCalled();
});

test("updateRole maps a duplicate name, rethrows failures and reports a vanished row", async () => {
  const { service, repository } = buildService();
  const body = { name: "REVIEWER", description: "Reviews", functionality_ids: [] };
  repository.updateRole.mockRejectedValueOnce({
    code: "23505",
    detail: "Key (name)=(REVIEWER) already exists.",
  });
  await expect(service.updateRole(OTHER_ID, body, USER_ID)).rejects.toMatchObject({
    code: "MSG-13",
  });

  const failure = new Error("database down");
  repository.updateRole.mockRejectedValueOnce(failure);
  await expect(service.updateRole(OTHER_ID, body, USER_ID)).rejects.toBe(failure);

  repository.findRoleById.mockResolvedValueOnce(role()).mockResolvedValueOnce(null);
  await expect(service.updateRole(OTHER_ID, body, USER_ID)).rejects.toMatchObject({
    code: "MSG-10",
  });
});

test("deleteRole removes an unused, non-administrator role", async () => {
  const { service, repository } = buildService();

  await expect(service.deleteRole(OTHER_ID)).resolves.toBeUndefined();
  expect(repository.countUsersByRole).toHaveBeenCalledWith(OTHER_ID);
  expect(repository.deleteRole).toHaveBeenCalledWith(OTHER_ID);
});

test("deleteRole rejects a malformed id and a missing role", async () => {
  const { service, repository } = buildService();

  await expect(service.deleteRole("not-a-uuid")).rejects.toMatchObject({ code: "INVALID_ID" });
  repository.findRoleById.mockResolvedValueOnce(null);
  await expect(service.deleteRole(OTHER_ID)).rejects.toMatchObject({ code: "MSG-10" });
  expect(repository.deleteRole).not.toHaveBeenCalled();
});

test("deleteRole refuses administrator roles and roles still in use", async () => {
  const { service, repository } = buildService();
  repository.findRoleById.mockResolvedValueOnce(administratorRole());
  await expect(service.deleteRole(OTHER_ID)).rejects.toMatchObject({
    code: "MSG-5",
    httpStatus: 403,
  });

  repository.countUsersByRole.mockResolvedValueOnce(2);
  await expect(service.deleteRole(OTHER_ID)).rejects.toMatchObject({
    code: "INVALID_FIELD",
    httpStatus: 409,
  });
  expect(repository.deleteRole).not.toHaveBeenCalled();
});
