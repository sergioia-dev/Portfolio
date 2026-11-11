import { RequestHandler, Router } from "express";
import { getProjectsByLang } from "../repository/projects_repository";

const projects: RequestHandler = async (request, response) => {
  try {
    const language: string | null = request.query.lang
      ? String(request.query.lang).toUpperCase()
      : null;

    if (language == null) {
      return response.status(400).json({ message: "Bad Request" });
    }
    return response.status(200).json(await getProjectsByLang(language));
  } catch (error) {
    console.error("!!! Error getRepository :\n", error);
    response.status(500).json({ error: "Internal Server Error" });
  }
};

const projectRouter = Router();

projectRouter.get("/projects", projects);

export default projectRouter;
