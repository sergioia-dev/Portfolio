import { randomUUID } from "node:crypto";
import type Functionality from "../../../shared/database/user/functionality.entity";
import type Role from "../../../shared/database/user/role.entity";
import type User from "../../../shared/database/user/user.entity";
import {
  type AdministrationError,
  administratorTarget,
  emailTaken,
  functionalityNotFound,
  roleGrantsAdministrator,
  roleInUse,
  roleNameTaken,
  roleNotFound,
  userNotFound,
  usernameTaken,
} from "../errors/administration.errors";
import type AdministrationRepository from "../repository/administration.repository";
import {
  type RoleInput,
  type UpdateUserInput,
  validateCreateRole,
  validateRoleId,
  validateSearchQuery,
  validateUpdate,
  validateUpdateRole,
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

const grantsAdministrator = (role: Role): boolean =>
  role.functionalities.some((functionality) => functionality.name === ADMINISTRATOR);

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

    if (input.rolId !== undefined) {
      const role = await this.repository.findRoleById(input.rolId);
      if (!role) throw roleNotFound();
      if (grantsAdministrator(role)) throw roleGrantsAdministrator();
    }

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

  async listRoles(): Promise<Role[]> {
    return this.repository.listRoles();
  }

  async listFunctionalities(): Promise<Functionality[]> {
    return this.repository.listFunctionalitiesExcludingAdministrator();
  }

  private async assertFunctionalitiesExist(functionalityIds: string[]): Promise<void> {
    if (functionalityIds.length === 0) return;
    const functionalities = await this.repository.findFunctionalities(functionalityIds);
    if (functionalities.length !== functionalityIds.length) throw functionalityNotFound();
  }

  async createRole(body: unknown): Promise<Role> {
    const input: RoleInput = unwrap(validateCreateRole(body));
    await this.assertFunctionalitiesExist(input.functionalityIds);

    const id = randomUUID();
    try {
      await this.repository.createRole({
        id,
        name: input.name,
        description: input.description,
        functionalityIds: input.functionalityIds,
      });
    } catch (error) {
      if (isUniqueViolation(error, "name")) throw roleNameTaken();
      throw error;
    }

    const created = await this.repository.findRoleById(id);
    if (!created) throw roleNotFound();
    return created;
  }

  async updateRole(roleId: unknown, body: unknown, callerUserId: string): Promise<Role> {
    const id = unwrap(validateRoleId(roleId));
    const existing = await this.repository.findRoleById(id);
    if (!existing) throw roleNotFound();

    const input: RoleInput = unwrap(validateUpdateRole(body));
    await this.assertFunctionalitiesExist(input.functionalityIds);

    const administratorFunctionality = existing.functionalities.find((functionality) => {
      return functionality.name === ADMINISTRATOR;
    });
    if (
      administratorFunctionality !== undefined &&
      !input.functionalityIds.includes(administratorFunctionality.id)
    ) {
      const caller = await this.repository.findByIdWithRoleAndFeatures(callerUserId);
      if (caller?.rol.id === id) throw roleGrantsAdministrator();
    }

    try {
      await this.repository.updateRole(id, {
        name: input.name,
        description: input.description,
        functionalityIds: input.functionalityIds,
      });
    } catch (error) {
      if (isUniqueViolation(error, "name")) throw roleNameTaken();
      throw error;
    }

    const updated = await this.repository.findRoleById(id);
    if (!updated) throw roleNotFound();
    return updated;
  }

  async deleteRole(roleId: unknown): Promise<void> {
    const id = unwrap(validateRoleId(roleId));
    const existing = await this.repository.findRoleById(id);
    if (!existing) throw roleNotFound();
    if (grantsAdministrator(existing)) throw roleGrantsAdministrator();
    if ((await this.repository.countUsersByRole(id)) > 0) throw roleInUse();
    await this.repository.deleteRole(id);
  }
}
