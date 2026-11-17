import type { DataSource, EntityManager } from "typeorm";
import User from "../../../shared/database/user/user.entity";
import UserInformation from "../../../shared/database/user/user_information.entity";

export interface AccountFields {
  username?: string;
  email?: string;
  password?: string;
}

export type InformationFields = Partial<
  Pick<
    UserInformation,
    "fullName" | "phone" | "country" | "githubUrl" | "gitlabUrl" | "linkedinUrl" | "businessEmail"
  >
>;

export default class UserRepository {
  constructor(private readonly dataSource: DataSource) {}

  findById(id: string): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({ where: { id } });
  }

  findByIdWithRelations(id: string): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({
      where: { id },
      relations: { rol: true, provider: true, information: true },
    });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({ where: { username } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({ where: { email } });
  }

  async updateAccount(
    id: string,
    fields: AccountFields,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<void> {
    if (Object.keys(fields).length === 0) return;
    await manager.getRepository(User).update({ id }, fields);
  }

  async upsertInformation(
    id: string,
    fields: InformationFields,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<void> {
    const repository = manager.getRepository(UserInformation);
    const existing = await repository.findOne({ where: { id } });
    if (existing) {
      if (Object.keys(fields).length > 0) await repository.update({ id }, fields);
      return;
    }
    await repository.save(repository.create({ id, ...fields }));
  }

  async softDelete(id: string): Promise<void> {
    await this.dataSource
      .getRepository(User)
      .update({ id }, { isDeleted: true, deletedAt: new Date() });
  }
}
