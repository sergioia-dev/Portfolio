import { Router } from "express";
import type Jwt from "../../../../shared/security/jwt/jwt";
import { requireAuth, type UserLookup } from "../../../auth/controller/auth.controller";
import type MessageRepository from "../../../auth/repository/message.repository";
import type ProjectController from "../controller/project.controller";
import { requireFeature, requireJson } from "../controller/project.controller";

export const projectRouter = (
  controller: ProjectController,
  jwt: Jwt,
  messageRepository: MessageRepository,
  userLookup: UserLookup,
): Router => {
  const router = Router();
  const authenticated = requireAuth(jwt, messageRepository, userLookup);
  const json = requireJson(messageRepository);

  router.post(
    "/portfolio/projects",
    json,
    authenticated,
    requireFeature("PORTFOLIO_CREATE", messageRepository),
    controller.create,
  );
  router.put(
    "/portfolio/projects/:id",
    json,
    authenticated,
    requireFeature("PORTFOLIO_UPDATE", messageRepository),
    controller.update,
  );
  router.delete(
    "/portfolio/projects/:id",
    authenticated,
    requireFeature("PORTFOLIO_DELETE", messageRepository),
    controller.remove,
  );
  router.get("/users/:userId/portfolio/projects", controller.list);
  router.get("/users/:userId/portfolio/projects/:id", controller.get);

  return router;
};
