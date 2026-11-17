import type { DataSource } from "typeorm";
import type User from "../../../shared/database/user/user.entity";
import type { PasswordHasher } from "../../auth/service/auth.service";
import { emailTaken, invalidField, unauthorized, usernameTaken } from "../errors/user.errors";

import type UserRepository from "../repository/user.repository";
import type { AccountFields } from "../repository/user.repository";

import { validateUpdateMe } from "../validators/user.validators";

export interface InformationResponse {
  full_name: string | null;
  phone: string | null;
  country: string | null;
  github_url: string | null;
  gitlab_url: string | null;
  linkedin_url: string | null;
  business_email: string | null;
}

export interface UserProfileResponse {
  id: string;
  username: string | null;
  email: string | null;
  provider: string;
  role: string;
  information: InformationResponse | null;
}

const LOCAL_PROVIDER = "LOCAL";

const isUniqueViolation = (error: unknown, column: string): boolean => {
  if (typeof error !== "object" || error === null) return false;
  const { code, detail } = error as { code?: unknown; detail?: unknown };
  return code === "23505" && typeof detail === "string" && detail.includes(column);
};

const toResponse = (user: User): UserProfileResponse => ({
  id: user.id,
  username: user.username,
  email: user.email,
  provider: user.provider.name,
  role: user.rol.name,
  information: user.information
    ? {
        full_name: user.information.fullName,
        phone: user.information.phone,
        country: user.information.country,
        github_url: user.information.githubUrl,
        gitlab_url: user.information.gitlabUrl,
        linkedin_url: user.information.linkedinUrl,
        business_email: user.information.businessEmail,
      }
    : null,
});

export default class UserService {
  constructor(
    private readonly repository: UserRepository,
    private readonly dataSource: DataSource,
    private readonly hasher: PasswordHasher,
  ) {}

  async getMe(userId: string): Promise<UserProfileResponse> {
    const user = await this.repository.findByIdWithRelations(userId);
    if (!user || user.isDeleted) throw unauthorized();
    return toResponse(user);
  }

  async updateMe(userId: string, body: unknown): Promise<UserProfileResponse> {
    const validation = validateUpdateMe(body);
    if ("error" in validation) throw validation.error;
    const input = validation.value;

    const existing = await this.repository.findByIdWithRelations(userId);
    if (!existing || existing.isDeleted) throw unauthorized();

    if (input.password !== undefined && existing.provider.name !== LOCAL_PROVIDER) {
      throw invalidField("password");
    }

    if (input.username !== undefined) {
      const owner = await this.repository.findByUsername(input.username);
      if (owner && owner.id !== userId) throw usernameTaken();
    }

    if (input.email !== undefined) {
      const owner = await this.repository.findByEmail(input.email);
      if (owner && owner.id !== userId) throw emailTaken();
    }

    try {
      const password =
        input.password === undefined ? undefined : await this.hasher.hash(input.password);

      await this.dataSource.transaction(async (manager) => {
        const account: AccountFields = {};
        if (input.username !== undefined) account.username = input.username;
        if (input.email !== undefined) account.email = input.email;
        if (password !== undefined) account.password = password;
        await this.repository.updateAccount(userId, account, manager);
        if (input.information !== undefined) {
          await this.repository.upsertInformation(userId, input.information, manager);
        }
      });
    } catch (error) {
      if (isUniqueViolation(error, "username")) throw usernameTaken();
      if (isUniqueViolation(error, "email")) throw emailTaken();
      throw error;
    }

    const updated = await this.repository.findByIdWithRelations(userId);
    if (!updated) throw unauthorized();
    return toResponse(updated);
  }

  async deleteMe(userId: string): Promise<void> {
    await this.repository.softDelete(userId);
  }
}
