import dataSource from "../shared/database/data-source";
import Project from "../shared/database/content/project.entity";
import { capitalizeFirstLetter } from "../util/string_manipulation";

const getProjectsByLang = async (language: string) => {
  const projects = await dataSource
    .getRepository(Project)
    .createQueryBuilder("project")
    .innerJoinAndSelect(
      "project.translations",
      "translation",
      "translation.language = :language",
      { language },
    )
    .leftJoinAndSelect("project.tags", "tag")
    .getMany();

  return projects.map((project) => ({
    id: project.id,
    website: project.website,
    repository: project.repository,
    title: project.translations[0].title,
    description: project.translations[0].description,
    tags: project.tags.map((tag) => ({
      name: capitalizeFirstLetter(tag.name),
      id: tag.id,
    })),
  }));
};

export { getProjectsByLang };
