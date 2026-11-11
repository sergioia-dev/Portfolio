import { RequestHandler, Router } from "express";
import { getTags } from "../repository/tags_repository";

const tags: RequestHandler = async (request, response) => {
  try {
    return response.status(200).json(await getTags());
  } catch (error) {
    console.error("!!! Error getBlogs :\n", error);
    response.status(500).json({ error: "Internal Server Error" });
  }
};

const tagsRouter = Router();

tagsRouter.get("/tags", tags);

export default tagsRouter;
