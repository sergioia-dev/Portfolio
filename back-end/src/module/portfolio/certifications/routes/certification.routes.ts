import { Router } from "express";
import type Jwt from "../../../../shared/security/jwt/jwt";
import { requireAuth } from "../../../auth/controller/auth.controller";
import type MessageRepository from "../../../auth/repository/message.repository";
import type CertificationController from "../controller/certification.controller";
import { requireFeature } from "../controller/certification.controller";

export const certificationRouter = (
  controller: CertificationController,
  jwt: Jwt,
  messageRepository: MessageRepository,
): Router => {
  const router = Router();
  const authenticated = requireAuth(jwt, messageRepository);

  router.post(
    "/portfolio/certifications",
    authenticated,
    requireFeature("PORTFOLIO_CREATE", messageRepository),
    controller.parseMultipart,
    controller.create,
  );
  router.patch(
    "/portfolio/certifications/:certificationId",
    authenticated,
    requireFeature("PORTFOLIO_UPDATE", messageRepository),
    controller.parseMultipart,
    controller.update,
  );
  router.delete(
    "/portfolio/certifications/:certificationId",
    authenticated,
    requireFeature("PORTFOLIO_DELETE", messageRepository),
    controller.remove,
  );
  router.get("/users/:userId/certifications", controller.list);
  router.get("/users/:userId/certifications/:certificationId", controller.get);

  return router;
};
