import { randomUUID } from "node:crypto";
import { type DataSource, In } from "typeorm";
import Functionality from "../../src/shared/database/user/functionality.entity";
import Role from "../../src/shared/database/user/role.entity";

const ROLES = [
  { name: "VISITOR", description: "Visitor role" },
  { name: "OWNER", description: "Owner role with portfolio management features" },
];

const OWNER_FUNCTIONALITIES = ["PORTFOLIO_CREATE", "PORTFOLIO_UPDATE", "PORTFOLIO_DELETE"];

const seedRoles = async (dataSource: DataSource) => {
  const repository = dataSource.getRepository(Role);
  const existing = await repository.find({ select: { name: true } });
  const names = new Set(existing.map((role) => role.name));

  const missing = ROLES.filter((role) => !names.has(role.name)).map((role) =>
    repository.create({ id: randomUUID(), ...role }),
  );

  if (missing.length > 0) await repository.save(missing);

  const owner = await repository.findOne({
    where: { name: "OWNER" },
    relations: { functionalities: true },
  });
  const functionalities = await dataSource.getRepository(Functionality).find({
    where: { name: In(OWNER_FUNCTIONALITIES) },
  });
  if (!owner || functionalities.length !== OWNER_FUNCTIONALITIES.length) {
    throw new Error("The functionality seeder must run before the roles seeder");
  }

  const linked = new Set(owner.functionalities.map((functionality) => functionality.name));
  const unlinked = functionalities.filter((functionality) => !linked.has(functionality.name));
  if (unlinked.length > 0) {
    owner.functionalities = [...owner.functionalities, ...unlinked];
    await repository.save(owner);
  }
};

export default seedRoles;
