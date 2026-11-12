import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import Language from "../../src/shared/database/language/language.entity";

const LANGUAGES = ["SPANISH", "ENGLISH"];

const seedLanguages = async (dataSource: DataSource) => {
  const repository = dataSource.getRepository(Language);
  const existing = await repository.find({ select: { name: true } });
  const names = new Set(existing.map((language) => language.name));

  const missing = LANGUAGES.filter((name) => !names.has(name)).map((name) =>
    repository.create({ id: randomUUID(), name }),
  );

  if (missing.length > 0) await repository.save(missing);
};

export default seedLanguages;
