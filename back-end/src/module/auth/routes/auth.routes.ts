import { Router } from "express";
import type AuthController from "../controller/auth.controller";

export const authRouter = (controller: AuthController): Router => {
  const router = Router();

  router.post("/register", controller.register);
  router.post("/login", controller.login);
  router.post("/refresh", controller.refresh);
  router.post("/logout", controller.logout);

  return router;
};
