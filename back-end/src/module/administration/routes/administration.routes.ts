import { Router } from "express";
import type Jwt from "../../../shared/security/jwt/jwt";
import { requireAuth, type UserLookup } from "../../auth/controller/auth.controller";
import type MessageRepository from "../../auth/repository/message.repository";
import { requireJson } from "../../users/controller/user.controller";
import type AdministrationController from "../controller/administration.controller";
import { requireFeature } from "../controller/administration.controller";

export const administrationRouter = (
  controller: AdministrationController,
  jwt: Jwt,
  messageRepository: MessageRepository,
  userLookup: UserLookup,
): Router => {
  const router = Router();
  const authenticated = requireAuth(jwt, messageRepository, userLookup);
  const administrator = requireFeature("ADMINISTRATOR", messageRepository);

  router.get("/", authenticated, administrator, controller.search);
  router.get("/roles", authenticated, administrator, controller.listRoles);
  router.post(
    "/roles",
    requireJson(messageRepository),
    authenticated,
    administrator,
    controller.createRole,
  );
  router.put(
    "/roles/:roleId",
    requireJson(messageRepository),
    authenticated,
    administrator,
    controller.updateRole,
  );
  router.delete("/roles/:roleId", authenticated, administrator, controller.deleteRole);
  router.get("/functionalities", authenticated, administrator, controller.listFunctionalities);
  router.patch(
    "/:userId",
    requireJson(messageRepository),
    authenticated,
    administrator,
    controller.update,
  );
  router.delete("/:userId", authenticated, administrator, controller.remove);

  return router;
};
