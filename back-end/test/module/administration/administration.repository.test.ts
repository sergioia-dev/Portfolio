import type { DataSource } from "typeorm";
import AdministrationRepository from "../../../src/module/administration/repository/administration.repository";
import User from "../../../src/shared/database/user/user.entity";

const USER_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";

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

const createRepositories = () => {
  const queryBuilder = createQueryBuilder();
  const user = {
    findOne: jest.fn(),
    update: jest.fn(async () => ({ affected: 1 })),
    createQueryBuilder: jest.fn(() => queryBuilder),
  };
  const repositories: Record<string, unknown> = { [User.name]: user };
  const getRepository = jest.fn((entity: { name: string }) => repositories[entity.name]);
  const dataSource = { getRepository } as unknown as DataSource;

  return {
    repository: new AdministrationRepository(dataSource),
    user,
    queryBuilder,
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
