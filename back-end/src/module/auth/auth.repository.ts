import type { DataSource } from "typeorm";
import Provider from "../../shared/database/user/provider.entity";
import Role from "../../shared/database/user/role.entity";
import User from "../../shared/database/user/user.entity";

export interface NewUser {
  id: string;
  username: string;
  email: string;
  password: string;
  provider: Provider;
  rol: Role;
}

export default class AuthRepository {
  constructor(private readonly dataSource: DataSource) {}

  findByEmail(email: string): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({ where: { email } });
  }

  findByUsername(username: string): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({ where: { username } });
  }

  findByEmailWithRole(email: string): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({
      where: { email },
      relations: { rol: { functionalities: true } },
    });
  }

  findByIdWithRole(id: string): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({
      where: { id },
      relations: { rol: { functionalities: true } },
    });
  }

  findRoleByName(name: string): Promise<Role | null> {
    return this.dataSource.getRepository(Role).findOne({ where: { name } });
  }

  findProviderByName(name: string): Promise<Provider | null> {
    return this.dataSource.getRepository(Provider).findOne({ where: { name } });
  }

  create(user: NewUser): Promise<User> {
    const repository = this.dataSource.getRepository(User);
    return repository.save(repository.create(user));
  }

  async softDelete(id: string): Promise<void> {
    await this.dataSource
      .getRepository(User)
      .update({ id }, { email: null, username: null, password: "", deletedAt: true });
  }
}
