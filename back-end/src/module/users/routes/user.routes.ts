import { Router } from "express";
import type Jwt from "../../../shared/security/jwt/jwt";
import { requireAuth, type UserLookup } from "../../auth/controller/auth.controller";
import type MessageRepository from "../../auth/repository/message.repository";
import type UserController from "../controller/user.controller";
import { requireJson } from "../controller/user.controller";

export const userRouter = (
  controller: UserController,
  jwt: Jwt,
  messageRepository: MessageRepository,
  userLookup: UserLookup,
): Router => {
  const router = Router();
  const authenticated = requireAuth(jwt, messageRepository, userLookup);
  const json = requireJson(messageRepository);

  router.get("/me", authenticated, controller.get);
  router.patch("/me", json, authenticated, controller.update);
  router.delete("/me", authenticated, controller.remove);

  return router;
};
