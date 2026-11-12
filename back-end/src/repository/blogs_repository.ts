import dataSource from "../shared/database/data-source";
import Blog from "../shared/database/content/blog.entity";
import { capitalizeFirstLetter } from "../util/string_manipulation";

interface BlogFilters {
  match?: string;
  tag?: string;
  quantity?: number;
}

const findBlogs = async (language: string, filters: BlogFilters) => {
  const query = dataSource
    .getRepository(Blog)
    .createQueryBuilder("blog")
    .innerJoinAndSelect(
      "blog.translations",
      "translation",
      "translation.language = :language",
      { language },
    )
    .leftJoinAndSelect("blog.tags", "tag");

  if (filters.match !== undefined) {
    query.andWhere("translation.title ILIKE :match", {
      match: `%${filters.match}%`,
    });
  }

  if (filters.tag !== undefined) {
    query.innerJoin("blog.tags", "filterTag", "filterTag.name = :tag", {
      tag: filters.tag,
    });
  }

  if (filters.quantity !== undefined) {
    query.limit(filters.quantity);
  }

  const blogs = await query.getMany();

  return blogs.map((blog) => ({
    id: blog.id,
    url: blog.url,
    image_path: blog.imagePath,
    title: blog.translations[0].title,
    description: blog.translations[0].description,
    tags: blog.tags.map((tag) => ({
      name: capitalizeFirstLetter(tag.name),
      id: tag.id,
    })),
  }));
};

const getBlogsByLang = (language: string) => findBlogs(language, {});

const getBlogsByLangAndQuantity = (language: string, quantity: number) =>
  findBlogs(language, { quantity });

const getBlogsByLangAndMatch = (language: string, match: string) =>
  findBlogs(language, { match });

const getBlogsByLangAndTag = (language: string, tag: string) =>
  findBlogs(language, { tag });

const getBlogsByLangAndTagAndQuantity = (
  language: string,
  tag: string,
  quantity: number,
) => findBlogs(language, { tag, quantity });

export {
  getBlogsByLang,
  getBlogsByLangAndQuantity,
  getBlogsByLangAndMatch,
  getBlogsByLangAndTag,
  getBlogsByLangAndTagAndQuantity,
};
