import type AuthRepository from "../../../src/module/auth/auth.repository";
import AuthService, {
  BcryptPasswordHasher,
  type PasswordHasher,
} from "../../../src/module/auth/auth.service";
import type User from "../../../src/shared/database/user/user.entity";
import type Jwt from "../../../src/shared/security/jwt/jwt";

const buildUser = (overrides: Partial<User> = {}): User =>
  ({
    id: "user-id",
    username: "john",
    email: "john@example.com",
    password: "hashed:Password1!",
    deletedAt: null,
    rol: {
      id: "role-id",
      name: "VISITOR",
      description: "Visitor role",
      functionalities: [{ id: "functionality-id", name: "READ_BLOGS" }],
    },
    ...overrides,
  }) as unknown as User;

const buildService = () => {
  const repository = {
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    findByEmailWithRole: jest.fn(),
    findByIdWithRole: jest.fn(),
    findRoleByName: jest.fn<Promise<{ id: string; name: string } | null>, []>(async () => ({
      id: "role-id",
      name: "VISITOR",
    })),
    findProviderByName: jest.fn(async () => ({ id: "provider-id", name: "LOCAL" })),
    create: jest.fn(async (input: Partial<User>) => buildUser(input)),
    softDelete: jest.fn(async () => undefined),
  };
  const jwt = {
    generateAccessToken: jest.fn(() => "access-token"),
    generateRefreshToken: jest.fn(() => "refresh-token"),
    verifyRefreshToken: jest.fn(() => ({ sub: "user-id" })),
  };
  const hasher = {
    hash: jest.fn(async (password: string) => `hashed:${password}`),
    compare: jest.fn(async (password: string, hash: string) => hash === `hashed:${password}`),
  };
  const service = new AuthService(
    repository as unknown as AuthRepository,
    jwt as unknown as Jwt,
    hasher as unknown as PasswordHasher,
  );

  return { service, repository, jwt, hasher };
};

const validRegister = {
  username: "john-doe",
  email: "john@example.com",
  password: "Password1!",
};

test("register hashes the password and returns the safe user", async () => {
  const { service, repository, hasher } = buildService();
  repository.findByUsername.mockResolvedValue(null);
  repository.findByEmail.mockResolvedValue(null);

  await expect(service.register(validRegister)).resolves.toEqual({
    id: expect.any(String),
    username: "john-doe",
    email: "john@example.com",
    role: "VISITOR",
  });
  expect(hasher.hash).toHaveBeenCalledWith("Password1!");
  expect(repository.create).toHaveBeenCalledWith(
    expect.objectContaining({
      username: "john-doe",
      email: "john@example.com",
      password: "hashed:Password1!",
      rol: { id: "role-id", name: "VISITOR" },
      provider: { id: "provider-id", name: "LOCAL" },
    }),
  );
});

test("register rejects a taken username with MSG-1", async () => {
  const { service, repository } = buildService();
  repository.findByUsername.mockResolvedValue(buildUser());

  await expect(service.register(validRegister)).rejects.toMatchObject({
    code: "MSG-1",
    httpStatus: 409,
  });
  expect(repository.create).not.toHaveBeenCalled();
});

test("register rejects a taken email with MSG-2", async () => {
  const { service, repository } = buildService();
  repository.findByUsername.mockResolvedValue(null);
  repository.findByEmail.mockResolvedValue(buildUser());

  await expect(service.register(validRegister)).rejects.toMatchObject({
    code: "MSG-2",
    httpStatus: 409,
  });
  expect(repository.create).not.toHaveBeenCalled();
});

test("register rejects an invalid password with MSG-3", async () => {
  const { service } = buildService();

  await expect(service.register({ ...validRegister, password: "weak" })).rejects.toMatchObject({
    code: "MSG-3",
    httpStatus: 400,
  });
});

test("register rejects a malformed email with INVALID_EMAIL", async () => {
  const { service } = buildService();

  await expect(service.register({ ...validRegister, email: "nope" })).rejects.toMatchObject({
    code: "INVALID_EMAIL",
    httpStatus: 400,
  });
});

test("register fails when the seed data is missing", async () => {
  const { service, repository } = buildService();
  repository.findByUsername.mockResolvedValue(null);
  repository.findByEmail.mockResolvedValue(null);
  repository.findRoleByName.mockResolvedValue(null);

  await expect(service.register(validRegister)).rejects.toThrow("Missing seed data");
  expect(repository.create).not.toHaveBeenCalled();
});

test("register maps a username unique violation from the database to MSG-1", async () => {
  const { service, repository } = buildService();
  repository.findByUsername.mockResolvedValue(null);
  repository.findByEmail.mockResolvedValue(null);
  repository.create.mockRejectedValue({
    code: "23505",
    detail: "Key (username)=(john-doe) already exists.",
  });

  await expect(service.register(validRegister)).rejects.toMatchObject({ code: "MSG-1" });
});

test("register maps an email unique violation from the database to MSG-2", async () => {
  const { service, repository } = buildService();
  repository.findByUsername.mockResolvedValue(null);
  repository.findByEmail.mockResolvedValue(null);
  repository.create.mockRejectedValue({
    code: "23505",
    detail: "Key (email)=(john@example.com) already exists.",
  });

  await expect(service.register(validRegister)).rejects.toMatchObject({ code: "MSG-2" });
});

test("register rethrows unrelated database errors", async () => {
  const { service, repository } = buildService();
  repository.findByUsername.mockResolvedValue(null);
  repository.findByEmail.mockResolvedValue(null);
  repository.create.mockRejectedValue(new Error("connection lost"));

  await expect(service.register(validRegister)).rejects.toThrow("connection lost");
});

test("login issues tokens for valid credentials", async () => {
  const { service, repository, jwt } = buildService();
  repository.findByEmailWithRole.mockResolvedValue(buildUser());

  await expect(
    service.login({ email: "john@example.com", password: "Password1!" }),
  ).resolves.toEqual({
    user: { id: "user-id", username: "john", email: "john@example.com", role: "VISITOR" },
    accessToken: "access-token",
    refreshToken: "refresh-token",
  });
  expect(jwt.generateAccessToken).toHaveBeenCalledWith("user-id", "john@example.com", "VISITOR", [
    "READ_BLOGS",
  ]);
  expect(jwt.generateRefreshToken).toHaveBeenCalledWith("user-id");
});

test("login rejects unknown, deleted and wrongly authenticated users with MSG-4", async () => {
  const { service, repository } = buildService();

  repository.findByEmailWithRole.mockResolvedValue(null);
  await expect(
    service.login({ email: "john@example.com", password: "Password1!" }),
  ).rejects.toMatchObject({ code: "MSG-4", httpStatus: 401 });

  repository.findByEmailWithRole.mockResolvedValue(buildUser({ deletedAt: true }));
  await expect(
    service.login({ email: "john@example.com", password: "Password1!" }),
  ).rejects.toMatchObject({ code: "MSG-4" });

  repository.findByEmailWithRole.mockResolvedValue(buildUser());
  await expect(
    service.login({ email: "john@example.com", password: "Wrong1!aa" }),
  ).rejects.toMatchObject({ code: "MSG-4" });
});

test("refresh issues a new access token", async () => {
  const { service, repository, jwt } = buildService();
  repository.findByIdWithRole.mockResolvedValue(buildUser());

  await expect(service.refresh("refresh-token")).resolves.toBe("access-token");
  expect(jwt.verifyRefreshToken).toHaveBeenCalledWith("refresh-token");
  expect(jwt.generateAccessToken).toHaveBeenCalledWith("user-id", "john@example.com", "VISITOR", [
    "READ_BLOGS",
  ]);
});

test("refresh rejects a missing, invalid, or deleted-user token with 401", async () => {
  const { service, repository, jwt } = buildService();

  await expect(service.refresh(null)).rejects.toMatchObject({
    code: "UNAUTHORIZED",
    httpStatus: 401,
  });
  await expect(service.refresh(undefined)).rejects.toMatchObject({ code: "UNAUTHORIZED" });

  jwt.verifyRefreshToken.mockImplementation(() => {
    throw new Error("invalid signature");
  });
  await expect(service.refresh("broken")).rejects.toMatchObject({ code: "UNAUTHORIZED" });

  jwt.verifyRefreshToken.mockReturnValue({ sub: "user-id" });
  repository.findByIdWithRole.mockResolvedValue(null);
  await expect(service.refresh("refresh-token")).rejects.toMatchObject({ code: "UNAUTHORIZED" });

  repository.findByIdWithRole.mockResolvedValue(buildUser({ deletedAt: true }));
  await expect(service.refresh("refresh-token")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});

test("deleteAccount soft-deletes the user", async () => {
  const { service, repository } = buildService();

  await service.deleteAccount("user-id");
  expect(repository.softDelete).toHaveBeenCalledWith("user-id");
});

test("bcrypt hasher hashes and compares passwords", async () => {
  const hasher = new BcryptPasswordHasher(4);
  const hash = await hasher.hash("Password1!");

  expect(hash).not.toBe("Password1!");
  await expect(hasher.compare("Password1!", hash)).resolves.toBe(true);
  await expect(hasher.compare("Other1!aa", hash)).resolves.toBe(false);
  expect(new BcryptPasswordHasher()).toBeInstanceOf(BcryptPasswordHasher);
});
