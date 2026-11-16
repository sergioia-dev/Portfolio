import { Router } from "express";
import type Jwt from "../../../../shared/security/jwt/jwt";
import { requireAuth } from "../../../auth/controller/auth.controller";
import type MessageRepository from "../../../auth/repository/message.repository";
import type ContributionController from "../controller/contribution.controller";
import { requireFeature, requireJson } from "../controller/contribution.controller";

export const contributionRouter = (
  controller: ContributionController,
  jwt: Jwt,
  messageRepository: MessageRepository,
): Router => {
  const router = Router();
  const authenticated = requireAuth(jwt, messageRepository);
  const json = requireJson(messageRepository);

  router.post(
    "/portfolio/contributions",
    json,
    authenticated,
    requireFeature("PORTFOLIO_CREATE", messageRepository),
    controller.create,
  );
  router.put(
    "/portfolio/contributions/:id",
    json,
    authenticated,
    requireFeature("PORTFOLIO_UPDATE", messageRepository),
    controller.update,
  );
  router.delete(
    "/portfolio/contributions/:id",
    authenticated,
    requireFeature("PORTFOLIO_DELETE", messageRepository),
    controller.remove,
  );
  router.get("/users/:userId/portfolio/contributions", controller.list);
  router.get("/users/:userId/portfolio/contributions/:id", controller.get);

  return router;
};
