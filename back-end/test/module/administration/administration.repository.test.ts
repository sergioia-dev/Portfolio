import type { DataSource, EntityManager } from "typeorm";
import AdministrationRepository from "../../../src/module/administration/repository/administration.repository";
import Functionality from "../../../src/shared/database/user/functionality.entity";
import Role from "../../../src/shared/database/user/role.entity";
import User from "../../../src/shared/database/user/user.entity";

const USER_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const ROLE_ID = "1b4c5d6e-7f80-4a1e-9a1e-2f1c9f2e0c3b";
const FUNCTIONALITY_ID = "9b1e3a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const OTHER_FUNCTIONALITY_ID = "3c2d1e0f-4a5b-4c6d-8e9f-0a1b2c3d4e5f";

const createQueryBuilder = () => {
  const builder = {
    leftJoinAndSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn(async () => [[{ id: USER_ID }], 1]),
  };
  for (const method of [
    "leftJoinAndSelect",
    "where",
    "andWhere",
    "orderBy",
    "skip",
    "take",
  ] as const) {
    builder[method].mockReturnValue(builder);
  }
  return builder;
};

const createRelationBuilder = () => {
  const builder = {
    relation: jest.fn(),
    of: jest.fn(),
    add: jest.fn(),
    addAndRemove: jest.fn(),
    remove: jest.fn(),
  };
  for (const method of ["relation", "of", "add", "addAndRemove", "remove"] as const) {
    builder[method].mockReturnValue(builder);
  }
  return builder;
};

const createRepositories = () => {
  const queryBuilder = createQueryBuilder();
  const relationBuilder = createRelationBuilder();
  const roleRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((role: unknown) => role),
    save: jest.fn(async (role: unknown) => role),
    update: jest.fn(async () => ({ affected: 1 })),
    delete: jest.fn(async () => ({ affected: 1 })),
    createQueryBuilder: jest.fn(() => relationBuilder),
  };
  const functionalityRepository = { find: jest.fn() };
  const user = {
    findOne: jest.fn(),
    update: jest.fn(async () => ({ affected: 1 })),
    count: jest.fn(async () => 0),
    createQueryBuilder: jest.fn(() => queryBuilder),
  };
  const repositories: Record<string, unknown> = {
    [User.name]: user,
    [Role.name]: roleRepository,
    [Functionality.name]: functionalityRepository,
  };
  const getRepository = jest.fn((entity: { name: string }) => repositories[entity.name]);
  const manager = { getRepository } as unknown as EntityManager;
  const transaction = jest.fn(async (run: (manager: EntityManager) => Promise<void>) =>
    run(manager),
  );
  const dataSource = { getRepository, transaction } as unknown as DataSource;

  return {
    repository: new AdministrationRepository(dataSource),
    user,
    roleRepository,
    functionalityRepository,
    queryBuilder,
    relationBuilder,
    transaction,
    getRepository,
  };
};

test("searchUsers matches email or username and loads the summary relations", async () => {
  const { repository, user, queryBuilder, getRepository } = createRepositories();

  await expect(
    repository.searchUsers({ query: "sergio", includeDeleted: false, limit: 20, page: 2 }),
  ).resolves.toEqual({ items: [{ id: USER_ID }], total: 1 });

  expect(getRepository).toHaveBeenCalledWith(User);
  expect(user.createQueryBuilder).toHaveBeenCalledWith("user");
  expect(queryBuilder.leftJoinAndSelect.mock.calls).toEqual([
    ["user.rol", "rol"],
    ["rol.functionalities", "functionality"],
    ["user.provider", "provider"],
    ["user.information", "information"],
  ]);
  expect(queryBuilder.where).toHaveBeenCalledWith(
    "(user.email ILIKE :pattern OR user.username ILIKE :pattern)",
    { pattern: "%sergio%" },
  );
  expect(queryBuilder.andWhere).toHaveBeenCalledWith(
    "(user.isDeleted = false AND user.deletedAt IS NULL)",
  );
  expect(queryBuilder.orderBy).toHaveBeenCalledWith("user.id", "ASC");
  expect(queryBuilder.skip).toHaveBeenCalledWith(20);
  expect(queryBuilder.take).toHaveBeenCalledWith(20);
});

test("searchUsers includes soft-deleted users on request", async () => {
  const { repository, queryBuilder } = createRepositories();

  await repository.searchUsers({ query: "sergio", includeDeleted: true, limit: 5, page: 1 });

  expect(queryBuilder.andWhere).not.toHaveBeenCalled();
  expect(queryBuilder.skip).toHaveBeenCalledWith(0);
});

test("findByIdWithRoleAndFeatures loads role features, provider and information", async () => {
  const { repository, user } = createRepositories();
  user.findOne.mockResolvedValue({ id: USER_ID });

  await expect(repository.findByIdWithRoleAndFeatures(USER_ID)).resolves.toEqual({ id: USER_ID });
  expect(user.findOne).toHaveBeenCalledWith({
    where: { id: USER_ID },
    relations: { rol: { functionalities: true }, provider: true, information: true },
  });
});

test("findByUsername and findByEmail use the unique columns", async () => {
  const { repository, user } = createRepositories();
  user.findOne.mockResolvedValue(null);

  await repository.findByUsername("sergio");
  expect(user.findOne).toHaveBeenCalledWith({ where: { username: "sergio" } });

  await repository.findByEmail("sergio@example.com");
  expect(user.findOne).toHaveBeenCalledWith({ where: { email: "sergio@example.com" } });
});

test("updateAccount updates only the given fields", async () => {
  const { repository, user } = createRepositories();

  await repository.updateAccount(USER_ID, { username: "sergio" });

  expect(user.update).toHaveBeenCalledWith({ id: USER_ID }, { username: "sergio" });
});

test("softDelete sets both delete markers", async () => {
  const { repository, user } = createRepositories();

  await repository.softDelete(USER_ID);

  const [criteria, changes] = user.update.mock.calls[0] as unknown as [
    { id: string },
    { isDeleted: boolean; deletedAt: unknown },
  ];
  expect(criteria).toEqual({ id: USER_ID });
  expect(changes.isDeleted).toBe(true);
  expect(changes.deletedAt).toBeInstanceOf(Date);
});

test("updateAccount forwards the role change as the relation column", async () => {
  const { repository, user } = createRepositories();

  await repository.updateAccount(USER_ID, { rolId: ROLE_ID });

  expect(user.update).toHaveBeenCalledWith({ id: USER_ID }, { rol: { id: ROLE_ID } });
});

test("listRoles loads the functionalities ordered by name", async () => {
  const { repository, roleRepository } = createRepositories();
  roleRepository.find.mockResolvedValueOnce([{ id: ROLE_ID }]);

  await expect(repository.listRoles()).resolves.toEqual([{ id: ROLE_ID }]);
  expect(roleRepository.find).toHaveBeenCalledWith({
    relations: { functionalities: true },
    order: { name: "ASC" },
  });
});

test("listFunctionalitiesExcludingAdministrator filters and orders by name", async () => {
  const { repository, functionalityRepository } = createRepositories();
  functionalityRepository.find.mockResolvedValueOnce([{ id: FUNCTIONALITY_ID }]);

  await expect(repository.listFunctionalitiesExcludingAdministrator()).resolves.toEqual([
    { id: FUNCTIONALITY_ID },
  ]);
  const options = functionalityRepository.find.mock.calls[0][0] as unknown as {
    where: { name: { type: string; value: string } };
    order: { name: string };
  };
  expect(options.where.name.type).toBe("not");
  expect(options.where.name.value).toBe("ADMINISTRATOR");
  expect(options.order).toEqual({ name: "ASC" });
});

test("findRoleById loads the role with its functionalities", async () => {
  const { repository, roleRepository } = createRepositories();
  roleRepository.findOne.mockResolvedValueOnce({ id: ROLE_ID });

  await expect(repository.findRoleById(ROLE_ID)).resolves.toEqual({ id: ROLE_ID });
  expect(roleRepository.findOne).toHaveBeenCalledWith({
    where: { id: ROLE_ID },
    relations: { functionalities: true },
  });
});

test("findFunctionalities looks the identifiers up in one query", async () => {
  const { repository, functionalityRepository } = createRepositories();
  functionalityRepository.find.mockResolvedValueOnce([]);

  await repository.findFunctionalities([FUNCTIONALITY_ID, OTHER_FUNCTIONALITY_ID]);

  const options = functionalityRepository.find.mock.calls[0][0] as unknown as {
    where: { id: { type: string; value: string[] } };
  };
  expect(options.where.id.type).toBe("in");
  expect(options.where.id.value).toEqual([FUNCTIONALITY_ID, OTHER_FUNCTIONALITY_ID]);
});

test("countUsersByRole counts every user holding the role", async () => {
  const { repository, user } = createRepositories();
  user.count.mockResolvedValueOnce(3);

  await expect(repository.countUsersByRole(ROLE_ID)).resolves.toBe(3);
  expect(user.count).toHaveBeenCalledWith({ where: { rol: { id: ROLE_ID } } });
});

test("createRole inserts the role and its mappings in one transaction", async () => {
  const { repository, roleRepository, relationBuilder, transaction } = createRepositories();

  await repository.createRole({
    id: ROLE_ID,
    name: "EDITOR",
    description: "Content editors",
    functionalityIds: [FUNCTIONALITY_ID],
  });

  expect(transaction).toHaveBeenCalledTimes(1);
  expect(roleRepository.create).toHaveBeenCalledWith({
    id: ROLE_ID,
    name: "EDITOR",
    description: "Content editors",
  });
  expect(roleRepository.save).toHaveBeenCalledWith({
    id: ROLE_ID,
    name: "EDITOR",
    description: "Content editors",
  });
  expect(relationBuilder.relation).toHaveBeenCalledWith(Role, "functionalities");
  expect(relationBuilder.of).toHaveBeenCalledWith(ROLE_ID);
  expect(relationBuilder.add).toHaveBeenCalledWith([FUNCTIONALITY_ID]);
});

test("createRole skips the mapping query without functionalities", async () => {
  const { repository, roleRepository, relationBuilder } = createRepositories();

  await repository.createRole({
    id: ROLE_ID,
    name: "EDITOR",
    description: "Content editors",
    functionalityIds: [],
  });

  expect(roleRepository.save).toHaveBeenCalled();
  expect(roleRepository.createQueryBuilder).not.toHaveBeenCalled();
  expect(relationBuilder.add).not.toHaveBeenCalled();
});

test("updateRole rewrites the row and diffs the mappings", async () => {
  const { repository, roleRepository, relationBuilder } = createRepositories();
  roleRepository.findOne.mockResolvedValueOnce({
    id: ROLE_ID,
    functionalities: [{ id: FUNCTIONALITY_ID }, { id: OTHER_FUNCTIONALITY_ID }],
  });

  await repository.updateRole(ROLE_ID, {
    name: "REVIEWER",
    description: "Reviews content",
    functionalityIds: [OTHER_FUNCTIONALITY_ID],
  });

  expect(roleRepository.update).toHaveBeenCalledWith(
    { id: ROLE_ID },
    { name: "REVIEWER", description: "Reviews content" },
  );
  expect(relationBuilder.addAndRemove).toHaveBeenCalledWith([], [FUNCTIONALITY_ID]);
});

test("updateRole skips the mapping query when nothing changes", async () => {
  const { repository, roleRepository, relationBuilder } = createRepositories();
  roleRepository.findOne.mockResolvedValueOnce({
    id: ROLE_ID,
    functionalities: [{ id: FUNCTIONALITY_ID }],
  });

  await repository.updateRole(ROLE_ID, {
    name: "REVIEWER",
    description: "Reviews content",
    functionalityIds: [FUNCTIONALITY_ID],
  });

  expect(roleRepository.update).toHaveBeenCalled();
  expect(roleRepository.createQueryBuilder).not.toHaveBeenCalled();
  expect(relationBuilder.addAndRemove).not.toHaveBeenCalled();
});

test("deleteRole detaches the mappings before removing the row", async () => {
  const { repository, roleRepository, relationBuilder } = createRepositories();
  roleRepository.findOne.mockResolvedValueOnce({
    id: ROLE_ID,
    functionalities: [{ id: FUNCTIONALITY_ID }],
  });

  await repository.deleteRole(ROLE_ID);

  expect(roleRepository.createQueryBuilder).toHaveBeenCalled();
  expect(relationBuilder.remove).toHaveBeenCalledWith([FUNCTIONALITY_ID]);
  expect(roleRepository.delete).toHaveBeenCalledWith({ id: ROLE_ID });
});

test("deleteRole skips the mapping cleanup for a role without functionalities", async () => {
  const { repository, roleRepository, relationBuilder } = createRepositories();
  roleRepository.findOne.mockResolvedValueOnce({ id: ROLE_ID, functionalities: [] });

  await repository.deleteRole(ROLE_ID);

  expect(roleRepository.createQueryBuilder).not.toHaveBeenCalled();
  expect(relationBuilder.remove).not.toHaveBeenCalled();
  expect(roleRepository.delete).toHaveBeenCalledWith({ id: ROLE_ID });
});

test("updateRole tolerates a concurrently removed row", async () => {
  const { repository, roleRepository, relationBuilder } = createRepositories();
  roleRepository.findOne.mockResolvedValueOnce(null);

  await repository.updateRole(ROLE_ID, {
    name: "REVIEWER",
    description: "Reviews content",
    functionalityIds: [FUNCTIONALITY_ID],
  });

  expect(relationBuilder.addAndRemove).toHaveBeenCalledWith([FUNCTIONALITY_ID], []);
});

test("deleteRole tolerates a concurrently removed row", async () => {
  const { repository, roleRepository } = createRepositories();
  roleRepository.findOne.mockResolvedValueOnce(null);

  await repository.deleteRole(ROLE_ID);

  expect(roleRepository.delete).toHaveBeenCalledWith({ id: ROLE_ID });
});
