import { Router } from "express";
import type Jwt from "../../../shared/security/jwt/jwt";
import type AuthController from "../controller/auth.controller";
import { requireAuth } from "../controller/auth.controller";
import type MessageRepository from "../repository/message.repository";

export const authRouter = (
  controller: AuthController,
  jwt: Jwt,
  messageRepository: MessageRepository,
): Router => {
  const router = Router();

  router.post("/register", controller.register);
  router.post("/login", controller.login);
  router.post("/refresh", controller.refresh);
  router.post("/logout", controller.logout);
  router.delete("/account", requireAuth(jwt, messageRepository), controller.deleteAccount);

  return router;
};
