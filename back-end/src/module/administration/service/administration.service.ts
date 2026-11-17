import type User from "../../../shared/database/user/user.entity";
import {
  type AdministrationError,
  administratorTarget,
  emailTaken,
  userNotFound,
  usernameTaken,
} from "../errors/administration.errors";
import type AdministrationRepository from "../repository/administration.repository";
import {
  type UpdateUserInput,
  validateSearchQuery,
  validateUpdate,
  validateUserId,
} from "../validators/administration.validators";

type Validation<T> = { value: T } | { error: AdministrationError };

export interface AdministrationSearchResult {
  items: User[];
  query: string;
  page: number;
  limit: number;
  total: number;
}

const ADMINISTRATOR = "ADMINISTRATOR";

export const isAdministrator = (user: User): boolean =>
  user.rol.functionalities.some((functionality) => functionality.name === ADMINISTRATOR);

const isUniqueViolation = (error: unknown, column: string): boolean => {
  if (typeof error !== "object" || error === null) return false;
  const { code, detail } = error as { code?: unknown; detail?: unknown };
  return code === "23505" && typeof detail === "string" && detail.includes(`(${column})`);
};

function unwrap<T>(result: Validation<T>): T {
  if ("error" in result) throw result.error;
  return result.value;
}

export default class AdministrationService {
  constructor(private readonly repository: AdministrationRepository) {}

  async search(rawQuery: unknown): Promise<AdministrationSearchResult> {
    const input = unwrap(validateSearchQuery(rawQuery));
    const { items, total } = await this.repository.searchUsers(input);
    return { items, query: input.query, page: input.page, limit: input.limit, total };
  }

  async update(targetId: unknown, body: unknown): Promise<User> {
    const id = unwrap(validateUserId(targetId));
    const target = await this.repository.findByIdWithRoleAndFeatures(id);
    if (!target || target.isDeleted || target.deletedAt !== null) throw userNotFound();
    if (isAdministrator(target)) throw administratorTarget();

    const input: UpdateUserInput = unwrap(validateUpdate(body));

    if (input.username !== undefined) {
      const owner = await this.repository.findByUsername(input.username);
      if (owner && owner.id !== id) throw usernameTaken();
    }
    if (input.email !== undefined) {
      const owner = await this.repository.findByEmail(input.email);
      if (owner && owner.id !== id) throw emailTaken();
    }

    try {
      await this.repository.updateAccount(id, input);
    } catch (error) {
      if (isUniqueViolation(error, "username")) throw usernameTaken();
      if (isUniqueViolation(error, "email")) throw emailTaken();
      throw error;
    }

    const updated = await this.repository.findByIdWithRoleAndFeatures(id);
    if (!updated) throw userNotFound();
    return updated;
  }

  async softDelete(targetId: unknown): Promise<void> {
    const id = unwrap(validateUserId(targetId));
    const target = await this.repository.findByIdWithRoleAndFeatures(id);
    if (!target) throw userNotFound();
    if (isAdministrator(target)) throw administratorTarget();
    if (target.isDeleted || target.deletedAt !== null) return;
    await this.repository.softDelete(id);
  }
}
