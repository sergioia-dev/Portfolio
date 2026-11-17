import type { DataSource, EntityManager } from "typeorm";
import UserRepository from "../../../src/module/users/repository/user.repository";
import User from "../../../src/shared/database/user/user.entity";
import UserInformation from "../../../src/shared/database/user/user_information.entity";

const USER_ID = "user-id";

const createRepositories = () => {
  const repositories = {
    [User.name]: {
      findOne: jest.fn(),
      update: jest.fn(async () => ({ affected: 1 })),
    },
    [UserInformation.name]: {
      findOne: jest.fn(),
      create: jest.fn((input) => input),
      save: jest.fn(async (input) => input),
      update: jest.fn(async () => ({ affected: 1 })),
    },
  };
  const getRepository = jest.fn((entity: { name: string }) => repositories[entity.name]);
  const manager = { getRepository } as unknown as EntityManager;
  const dataSource = { getRepository, manager } as unknown as DataSource;

  return { repository: new UserRepository(dataSource), repositories, manager, dataSource };
};

test("findById returns the account without relations", async () => {
  const { repository, repositories } = createRepositories();
  repositories[User.name].findOne.mockResolvedValue({ id: USER_ID });

  await expect(repository.findById(USER_ID)).resolves.toEqual({ id: USER_ID });
  expect(repositories[User.name].findOne).toHaveBeenCalledWith({ where: { id: USER_ID } });
});

test("findByIdWithRelations loads role, provider and information", async () => {
  const { repository, repositories } = createRepositories();
  repositories[User.name].findOne.mockResolvedValue({ id: USER_ID });

  await expect(repository.findByIdWithRelations(USER_ID)).resolves.toEqual({ id: USER_ID });
  expect(repositories[User.name].findOne).toHaveBeenCalledWith({
    where: { id: USER_ID },
    relations: { rol: true, provider: true, information: true },
  });
});

test("findByUsername and findByEmail look the account up by unique column", async () => {
  const { repository, repositories } = createRepositories();
  repositories[User.name].findOne.mockResolvedValue({ id: USER_ID });

  await repository.findByUsername("john");
  expect(repositories[User.name].findOne).toHaveBeenCalledWith({ where: { username: "john" } });

  await repository.findByEmail("john@example.com");
  expect(repositories[User.name].findOne).toHaveBeenCalledWith({
    where: { email: "john@example.com" },
  });
});

test("updateAccount updates the account through the manager", async () => {
  const { repository, repositories, manager } = createRepositories();

  await repository.updateAccount(USER_ID, { username: "john" }, manager);

  expect(repositories[User.name].update).toHaveBeenCalledWith(
    { id: USER_ID },
    { username: "john" },
  );
});

test("updateAccount ignores an empty update", async () => {
  const { repository, repositories } = createRepositories();

  await repository.updateAccount(USER_ID, {});

  expect(repositories[User.name].update).not.toHaveBeenCalled();
});

test("upsertInformation updates an existing profile", async () => {
  const { repository, repositories, manager } = createRepositories();
  repositories[UserInformation.name].findOne.mockResolvedValue({ id: USER_ID });

  await repository.upsertInformation(USER_ID, { fullName: "John Doe" }, manager);

  expect(repositories[UserInformation.name].update).toHaveBeenCalledWith(
    { id: USER_ID },
    { fullName: "John Doe" },
  );
  expect(repositories[UserInformation.name].save).not.toHaveBeenCalled();
});

test("upsertInformation skips an empty update for an existing profile", async () => {
  const { repository, repositories } = createRepositories();
  repositories[UserInformation.name].findOne.mockResolvedValue({ id: USER_ID });

  await repository.upsertInformation(USER_ID, {});

  expect(repositories[UserInformation.name].update).not.toHaveBeenCalled();
  expect(repositories[UserInformation.name].save).not.toHaveBeenCalled();
});

test("upsertInformation creates the profile when it does not exist", async () => {
  const { repository, repositories } = createRepositories();
  repositories[UserInformation.name].findOne.mockResolvedValue(null);

  await repository.upsertInformation(USER_ID, { country: "Colombia" });

  expect(repositories[UserInformation.name].create).toHaveBeenCalledWith({
    id: USER_ID,
    country: "Colombia",
  });
  expect(repositories[UserInformation.name].save).toHaveBeenCalledWith({
    id: USER_ID,
    country: "Colombia",
  });
});

test("softDelete sets both delete markers", async () => {
  const { repository, repositories } = createRepositories();

  await repository.softDelete(USER_ID);

  expect(repositories[User.name].update).toHaveBeenCalledWith(
    { id: USER_ID },
    { isDeleted: true, deletedAt: expect.any(Date) },
  );
});
