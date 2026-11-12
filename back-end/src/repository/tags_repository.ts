import dataSource from "../shared/database/data-source";
import Tag from "../shared/database/content/tag.entity";
import { capitalizeFirstLetter } from "../util/string_manipulation";

const getTags = async () => {
  const tags = await dataSource.getRepository(Tag).find();

  return tags.map((tag) => ({
    name: capitalizeFirstLetter(tag.name),
    id: tag.id,
  }));
};

export { getTags };
