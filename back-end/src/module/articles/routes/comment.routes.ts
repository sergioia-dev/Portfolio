import { Router } from "express";
import type Jwt from "../../../shared/security/jwt/jwt";
import { requireAuth, type UserLookup } from "../../auth/controller/auth.controller";
import type MessageRepository from "../../auth/repository/message.repository";
import { requireFeature, requireJson } from "../controller/article.controller";
import type CommentController from "../controller/comment.controller";

export const commentRouter = (
  controller: CommentController,
  jwt: Jwt,
  messageRepository: MessageRepository,
  userLookup: UserLookup,
): Router => {
  const router = Router();
  const authenticated = requireAuth(jwt, messageRepository, userLookup);
  const json = requireJson(messageRepository);
  const visitor = requireFeature("VISITOR", messageRepository);

  router.get("/users/:userId/portfolio/articles/:articleId/comments", controller.list);
  router.post(
    "/users/:userId/portfolio/articles/:articleId/comments",
    json,
    authenticated,
    visitor,
    controller.create,
  );
  router.patch(
    "/users/:userId/portfolio/articles/:articleId/comments/:commentId",
    json,
    authenticated,
    visitor,
    controller.update,
  );
  router.delete(
    "/users/:userId/portfolio/articles/:articleId/comments/:commentId",
    authenticated,
    visitor,
    controller.remove,
  );

  return router;
};
