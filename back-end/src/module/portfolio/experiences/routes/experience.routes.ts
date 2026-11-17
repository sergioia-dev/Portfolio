import { Router } from "express";
import type Jwt from "../../../../shared/security/jwt/jwt";
import { requireAuth, type UserLookup } from "../../../auth/controller/auth.controller";
import type MessageRepository from "../../../auth/repository/message.repository";
import type ExperienceController from "../controller/experience.controller";
import { requireFeature } from "../controller/experience.controller";

export const experienceRouter = (
  controller: ExperienceController,
  jwt: Jwt,
  messageRepository: MessageRepository,
  userLookup: UserLookup,
): Router => {
  const router = Router();
  const authenticated = requireAuth(jwt, messageRepository, userLookup);

  router.post(
    "/portfolio/experiences",
    authenticated,
    requireFeature("PORTFOLIO_CREATE", messageRepository),
    controller.create,
  );
  router.put(
    "/portfolio/experiences/:id",
    authenticated,
    requireFeature("PORTFOLIO_UPDATE", messageRepository),
    controller.update,
  );
  router.delete(
    "/portfolio/experiences/:id",
    authenticated,
    requireFeature("PORTFOLIO_DELETE", messageRepository),
    controller.remove,
  );
  router.get("/users/:userId/portfolio/experiences", controller.list);
  router.get("/users/:userId/portfolio/experiences/:id", controller.get);

  return router;
};
