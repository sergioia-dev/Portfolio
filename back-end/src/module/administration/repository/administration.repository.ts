import type { DataSource } from "typeorm";
import { In, Not } from "typeorm";
import Functionality from "../../../shared/database/user/functionality.entity";
import Role from "../../../shared/database/user/role.entity";
import User from "../../../shared/database/user/user.entity";

export interface SearchUsersOptions {
  query: string;
  includeDeleted: boolean;
  limit: number;
  page: number;
}

export interface SearchUsersResult {
  items: User[];
  total: number;
}

export interface AccountFields {
  username?: string;
  email?: string;
  rolId?: string;
}

export interface NewRole {
  id: string;
  name: string;
  description: string;
  functionalityIds: string[];
}

export interface RoleFields {
  name: string;
  description: string;
  functionalityIds: string[];
}

const ADMINISTRATOR = "ADMINISTRATOR";

export default class AdministrationRepository {
  constructor(private readonly dataSource: DataSource) {}

  private get repository() {
    return this.dataSource.getRepository(User);
  }

  private get roles() {
    return this.dataSource.getRepository(Role);
  }

  async searchUsers(options: SearchUsersOptions): Promise<SearchUsersResult> {
    const builder = this.repository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.rol", "rol")
      .leftJoinAndSelect("rol.functionalities", "functionality")
      .leftJoinAndSelect("user.provider", "provider")
      .leftJoinAndSelect("user.information", "information")
      .where("(user.email ILIKE :pattern OR user.username ILIKE :pattern)", {
        pattern: `%${options.query}%`,
      });

    if (!options.includeDeleted) {
      builder.andWhere("(user.isDeleted = false AND user.deletedAt IS NULL)");
    }

    const [items, total] = await builder
      .orderBy("user.id", "ASC")
      .skip((options.page - 1) * options.limit)
      .take(options.limit)
      .getManyAndCount();

    return { items, total };
  }

  findByIdWithRoleAndFeatures(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: {
        rol: { functionalities: true },
        provider: true,
        information: true,
      },
    });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.repository.findOne({ where: { username } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async updateAccount(id: string, fields: AccountFields): Promise<void> {
    const { rolId, ...columns } = fields;
    const changes = rolId === undefined ? columns : { ...columns, rol: { id: rolId } };
    await this.repository.update({ id }, changes);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.update({ id }, { isDeleted: true, deletedAt: new Date() });
  }

  listRoles(): Promise<Role[]> {
    return this.roles.find({
      relations: { functionalities: true },
      order: { name: "ASC" },
    });
  }

  listFunctionalitiesExcludingAdministrator(): Promise<Functionality[]> {
    return this.dataSource.getRepository(Functionality).find({
      where: { name: Not(ADMINISTRATOR) },
      order: { name: "ASC" },
    });
  }

  findRoleById(id: string): Promise<Role | null> {
    return this.roles.findOne({ where: { id }, relations: { functionalities: true } });
  }

  findFunctionalities(ids: string[]): Promise<Functionality[]> {
    return this.dataSource.getRepository(Functionality).find({ where: { id: In(ids) } });
  }

  countUsersByRole(roleId: string): Promise<number> {
    return this.repository.count({ where: { rol: { id: roleId } } });
  }

  async createRole(input: NewRole): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Role);
      await repository.save(
        repository.create({
          id: input.id,
          name: input.name,
          description: input.description,
        }),
      );
      if (input.functionalityIds.length === 0) return;
      await repository
        .createQueryBuilder()
        .relation(Role, "functionalities")
        .of(input.id)
        .add(input.functionalityIds);
    });
  }

  async updateRole(id: string, fields: RoleFields): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Role);
      await repository.update({ id }, { name: fields.name, description: fields.description });
      const role = await repository.findOne({
        where: { id },
        relations: { functionalities: true },
      });
      const existingIds = (role?.functionalities ?? []).map((functionality) => functionality.id);
      const addIds = fields.functionalityIds.filter((functionalityId) => {
        return !existingIds.includes(functionalityId);
      });
      const removeIds = existingIds.filter((functionalityId) => {
        return !fields.functionalityIds.includes(functionalityId);
      });
      if (addIds.length === 0 && removeIds.length === 0) return;
      await repository
        .createQueryBuilder()
        .relation(Role, "functionalities")
        .of(id)
        .addAndRemove(addIds, removeIds);
    });
  }

  async deleteRole(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Role);
      const role = await repository.findOne({
        where: { id },
        relations: { functionalities: true },
      });
      const functionalityIds = (role?.functionalities ?? []).map(
        (functionality) => functionality.id,
      );
      if (functionalityIds.length > 0) {
        await repository
          .createQueryBuilder()
          .relation(Role, "functionalities")
          .of(id)
          .remove(functionalityIds);
      }
      await repository.delete({ id });
    });
  }
}
