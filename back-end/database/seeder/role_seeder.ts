import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import Role from "../../src/shared/database/user/role.entity";

const ROLES = [{ name: "VISITOR", description: "Visitor role" }];

const seedRoles = async (dataSource: DataSource) => {
  const repository = dataSource.getRepository(Role);
  const existing = await repository.find({ select: { name: true } });
  const names = new Set(existing.map((role) => role.name));

  const missing = ROLES.filter((role) => !names.has(role.name)).map((role) =>
    repository.create({ id: randomUUID(), ...role }),
  );

  if (missing.length > 0) await repository.save(missing);
};

export default seedRoles;
