import { Router } from "express";
import type Jwt from "../../../../shared/security/jwt/jwt";
import { requireAuth, type UserLookup } from "../../../auth/controller/auth.controller";
import type MessageRepository from "../../../auth/repository/message.repository";
import type TagController from "../controller/tag.controller";
import { requireFeature } from "../controller/tag.controller";

export const tagRouter = (
  controller: TagController,
  jwt: Jwt,
  messageRepository: MessageRepository,
  userLookup: UserLookup,
): Router => {
  const router = Router();
  const authenticated = requireAuth(jwt, messageRepository, userLookup);

  router.post(
    "/portfolio/tags",
    authenticated,
    requireFeature("PORTFOLIO_CREATE", messageRepository),
    controller.parseMultipart,
    controller.create,
  );
  router.put(
    "/portfolio/tags/:id",
    authenticated,
    requireFeature("PORTFOLIO_UPDATE", messageRepository),
    controller.parseMultipart,
    controller.update,
  );
  router.delete(
    "/portfolio/tags/:id",
    authenticated,
    requireFeature("PORTFOLIO_DELETE", messageRepository),
    controller.remove,
  );
  router.get("/users/:userId/tags", controller.list);
  router.get("/users/:userId/tags/:id", controller.get);

  return router;
};
