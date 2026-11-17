import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import Functionality from "../../src/shared/database/user/functionality.entity";

const FUNCTIONALITIES = [
  {
    name: "PORTFOLIO_CREATE",
    description: "Can create a new object in the user owns account with this functionality",
  },
  {
    name: "PORTFOLIO_UPDATE",
    description: "Can edit a object of the user owns account",
  },
  {
    name: "PORTFOLIO_DELETE",
    description: "Can delete a user owns object",
  },
  {
    name: "ADMINISTRATOR",
    description:
      "Can search users and update or soft delete accounts of users who do not have the ADMINISTRATOR feature",
  },
];

const seedFunctionalities = async (dataSource: DataSource) => {
  const repository = dataSource.getRepository(Functionality);
  const existing = await repository.find({ select: { name: true } });
  const names = new Set(existing.map((functionality) => functionality.name));

  const missing = FUNCTIONALITIES.filter((item) => !names.has(item.name)).map((item) =>
    repository.create({ id: randomUUID(), ...item }),
  );

  if (missing.length > 0) await repository.save(missing);
};

export default seedFunctionalities;
