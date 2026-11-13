import type { DataSource } from "typeorm";
import AuthRepository, { type NewUser } from "../../../src/module/auth/auth.repository";
import Provider from "../../../src/shared/database/user/provider.entity";
import Role from "../../../src/shared/database/user/role.entity";
import User from "../../../src/shared/database/user/user.entity";

const createRepository = () => {
  const fakeRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((input: unknown) => input),
    save: jest.fn(async (input: unknown) => input),
    update: jest.fn(async () => ({ affected: 1 })),
  };
  const dataSource = {
    getRepository: jest.fn(() => fakeRepository),
  } as unknown as DataSource;

  return { repository: new AuthRepository(dataSource), fakeRepository, dataSource };
};

test("findByEmail looks a user up by email", async () => {
  const { repository, fakeRepository, dataSource } = createRepository();
  fakeRepository.findOne.mockResolvedValue({ id: "user-id" });

  await expect(repository.findByEmail("john@example.com")).resolves.toEqual({ id: "user-id" });
  expect(dataSource.getRepository).toHaveBeenCalledWith(User);
  expect(fakeRepository.findOne).toHaveBeenCalledWith({ where: { email: "john@example.com" } });
});

test("findByUsername looks a user up by username", async () => {
  const { repository, fakeRepository, dataSource } = createRepository();
  fakeRepository.findOne.mockResolvedValue(null);

  await expect(repository.findByUsername("john")).resolves.toBeNull();
  expect(dataSource.getRepository).toHaveBeenCalledWith(User);
  expect(fakeRepository.findOne).toHaveBeenCalledWith({ where: { username: "john" } });
});

test("findByEmailWithRole loads the role and its functionalities", async () => {
  const { repository, fakeRepository } = createRepository();
  fakeRepository.findOne.mockResolvedValue({ id: "user-id" });

  await repository.findByEmailWithRole("john@example.com");
  expect(fakeRepository.findOne).toHaveBeenCalledWith({
    where: { email: "john@example.com" },
    relations: { rol: { functionalities: true } },
  });
});

test("findByIdWithRole loads the role and its functionalities", async () => {
  const { repository, fakeRepository } = createRepository();
  fakeRepository.findOne.mockResolvedValue({ id: "user-id" });

  await repository.findByIdWithRole("user-id");
  expect(fakeRepository.findOne).toHaveBeenCalledWith({
    where: { id: "user-id" },
    relations: { rol: { functionalities: true } },
  });
});

test("findRoleByName and findProviderByName delegate to their repositories", async () => {
  const { repository, fakeRepository, dataSource } = createRepository();
  fakeRepository.findOne.mockResolvedValue({ name: "VISITOR" });

  await repository.findRoleByName("VISITOR");
  expect(dataSource.getRepository).toHaveBeenCalledWith(Role);
  expect(fakeRepository.findOne).toHaveBeenCalledWith({ where: { name: "VISITOR" } });

  await repository.findProviderByName("LOCAL");
  expect(dataSource.getRepository).toHaveBeenCalledWith(Provider);
  expect(fakeRepository.findOne).toHaveBeenCalledWith({ where: { name: "LOCAL" } });
});

test("create saves a new user entity", async () => {
  const { repository, fakeRepository } = createRepository();
  const provider = { id: "provider-id", name: "LOCAL" } as Provider;
  const rol = { id: "role-id", name: "VISITOR" } as Role;
  const input: NewUser = {
    id: "user-id",
    username: "john",
    email: "john@example.com",
    password: "hash",
    provider,
    rol,
  };

  await expect(repository.create(input)).resolves.toBe(input);
  expect(fakeRepository.create).toHaveBeenCalledWith(input);
  expect(fakeRepository.save).toHaveBeenCalledWith(input);
});

test("softDelete clears the identifiers and marks the user deleted", async () => {
  const { repository, fakeRepository } = createRepository();

  await repository.softDelete("user-id");
  expect(fakeRepository.update).toHaveBeenCalledWith(
    { id: "user-id" },
    { email: null, username: null, password: "", deletedAt: true },
  );
});
