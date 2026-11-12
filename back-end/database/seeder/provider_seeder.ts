import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import Provider from "../../src/shared/database/user/provider.entity";

const PROVIDERS = ["LOCAL", "GITHUB"];

const seedProviders = async (dataSource: DataSource) => {
  const repository = dataSource.getRepository(Provider);
  const existing = await repository.find({ select: { name: true } });
  const names = new Set(existing.map((provider) => provider.name));

  const missing = PROVIDERS.filter((name) => !names.has(name)).map((name) =>
    repository.create({ id: randomUUID(), name }),
  );

  if (missing.length > 0) await repository.save(missing);
};

export default seedProviders;
