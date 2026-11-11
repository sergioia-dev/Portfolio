import { RequestHandler, Router } from "express";
import {
  getBlogsByLang,
  getBlogsByLangAndQuantity,
  getBlogsByLangAndMatch,
  getBlogsByLangAndTag,
  getBlogsByLangAndTagAndQuantity,
} from "../repository/blogs_repository";

// Route: /blogs?lang= or /blogs?lang=&match= /blogs?lang=&match=
const getBlogs: RequestHandler = async (request, response) => {
  try {
    const language: string | null = request.query.lang
      ? String(request.query.lang).trim().toUpperCase()
      : null;

    let match: string | null = request.query.match
      ? String(request.query.match).trim().toUpperCase()
      : null;

    const tag: string | null = request.query.tag
      ? String(request.query.tag).trim().toUpperCase()
      : null;

    const quantity: number | null = request.query.quantity
      ? Number(request.query.quantity)
      : null;

    if (language == null)
      return response.status(400).json({ error: "Bad Request" });

    if (language !== "EN" && language !== "ES") {
      return response.status(400).json({ error: "Bad Request" });
    }

    if (quantity != null && tag != null) {
      return response
        .status(200)
        .json(await getBlogsByLangAndTagAndQuantity(language, tag, quantity));
    }

    if (quantity != null) {
      return response
        .status(200)
        .json(await getBlogsByLangAndQuantity(language, quantity));
    }

    if (match != null) {
      match = match.replace(/[%_\\]/g, "\\$&");

      return response
        .status(200)
        .json(await getBlogsByLangAndMatch(language, match));
    }

    if (tag != null) {
      return response
        .status(200)
        .json(await getBlogsByLangAndTag(language, tag));
    }
    return response.status(200).json(await getBlogsByLang(language));
  } catch (error) {
    console.error("!!! Error getBlogs :\n", error);
    response.status(500).json({ message: "Internal Server Error" });
  }
};

const blogRouter = Router({ mergeParams: true });

blogRouter.get("/blogs", getBlogs);

export default blogRouter;
