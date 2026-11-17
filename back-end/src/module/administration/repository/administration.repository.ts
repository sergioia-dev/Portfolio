import type { DataSource } from "typeorm";
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
}

export default class AdministrationRepository {
  constructor(private readonly dataSource: DataSource) {}

  private get repository() {
    return this.dataSource.getRepository(User);
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
    await this.repository.update({ id }, fields);
  }

  async softDelete(id: string): Promise<void> {
    await this.repository.update({ id }, { isDeleted: true, deletedAt: new Date() });
  }
}
