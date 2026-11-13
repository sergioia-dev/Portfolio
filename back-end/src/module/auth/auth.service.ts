import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import type User from "../../shared/database/user/user.entity";
import type Jwt from "../../shared/security/jwt/jwt";
import { emailTaken, invalidCredentials, unauthorized, usernameTaken } from "./auth.errors";
import type AuthRepository from "./auth.repository";
import { validateLogin, validateRegister } from "./auth.validators";

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly cost = 12) {}

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.cost);
  }

  compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

export interface SafeUser {
  id: string;
  username: string | null;
  email: string | null;
  role: string;
}

export interface LoginResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

const DEFAULT_ROLE = "VISITOR";
const DEFAULT_PROVIDER = "LOCAL";

const toSafeUser = (user: User): SafeUser => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.rol.name,
});

const isUniqueViolation = (error: unknown, column: string): boolean => {
  if (typeof error !== "object" || error === null) return false;
  const { code, detail } = error as { code?: unknown; detail?: unknown };
  return code === "23505" && typeof detail === "string" && detail.includes(column);
};

export default class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly jwt: Jwt,
    private readonly hasher: PasswordHasher,
  ) {}

  async register(body: unknown): Promise<SafeUser> {
    const validation = validateRegister(body);
    if ("error" in validation) throw validation.error;
    const { username, email, password } = validation.value;

    if (await this.repository.findByUsername(username)) throw usernameTaken();
    if (await this.repository.findByEmail(email)) throw emailTaken();

    const [role, provider] = await Promise.all([
      this.repository.findRoleByName(DEFAULT_ROLE),
      this.repository.findProviderByName(DEFAULT_PROVIDER),
    ]);
    if (!role || !provider) {
      throw new Error(`Missing seed data: role ${DEFAULT_ROLE} or provider ${DEFAULT_PROVIDER}`);
    }

    try {
      const created = await this.repository.create({
        id: randomUUID(),
        username,
        email,
        password: await this.hasher.hash(password),
        rol: role,
        provider,
      });
      return toSafeUser(created);
    } catch (error) {
      if (isUniqueViolation(error, "username")) throw usernameTaken();
      if (isUniqueViolation(error, "email")) throw emailTaken();
      throw error;
    }
  }

  async login(body: unknown): Promise<LoginResult> {
    const validation = validateLogin(body);
    if ("error" in validation) throw validation.error;
    const { email, password } = validation.value;

    const user = await this.repository.findByEmailWithRole(email);
    if (!user || user.deletedAt) throw invalidCredentials();
    if (!(await this.hasher.compare(password, user.password))) throw invalidCredentials();

    return {
      user: toSafeUser(user),
      accessToken: this.jwt.generateAccessToken(
        user.id,
        email,
        user.rol.name,
        user.rol.functionalities.map((functionality) => functionality.name),
      ),
      refreshToken: this.jwt.generateRefreshToken(user.id),
    };
  }

  async refresh(refreshToken: string | null | undefined): Promise<string> {
    if (!refreshToken) throw unauthorized();

    let subject: string;
    try {
      subject = this.jwt.verifyRefreshToken(refreshToken).sub;
    } catch {
      throw unauthorized();
    }

    const user = await this.repository.findByIdWithRole(subject);
    if (!user || user.deletedAt) throw unauthorized();

    return this.jwt.generateAccessToken(
      user.id,
      user.email ?? "",
      user.rol.name,
      user.rol.functionalities.map((functionality) => functionality.name),
    );
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.repository.softDelete(userId);
  }
}
