import { Router } from "express";
import type Jwt from "../../../shared/security/jwt/jwt";
import { requireAuth, type UserLookup } from "../../auth/controller/auth.controller";
import type MessageRepository from "../../auth/repository/message.repository";
import type ArticleController from "../controller/article.controller";
import { requireFeature, requireJson } from "../controller/article.controller";

export const articleRouter = (
  controller: ArticleController,
  jwt: Jwt,
  messageRepository: MessageRepository,
  userLookup: UserLookup,
): Router => {
  const router = Router();
  const authenticated = requireAuth(jwt, messageRepository, userLookup);
  const json = requireJson(messageRepository);

  router.post(
    "/portfolio/articles",
    json,
    authenticated,
    requireFeature("ARTICLE_CREATE", messageRepository),
    controller.create,
  );
  router.put(
    "/portfolio/articles/:id",
    json,
    authenticated,
    requireFeature("ARTICLE_UPDATE", messageRepository),
    controller.update,
  );
  router.delete(
    "/portfolio/articles/:id",
    authenticated,
    requireFeature("ARTICLE_DELETE", messageRepository),
    controller.remove,
  );
  router.get("/users/:userId/portfolio/articles", controller.list);
  router.get("/users/:userId/portfolio/articles/:id", controller.get);

  return router;
};
