import type { Request, RequestHandler, Response } from "express";
import type User from "../../../shared/database/user/user.entity";
import type { AuthenticatedRequest } from "../../auth/controller/auth.controller";
import type MessageRepository from "../../auth/repository/message.repository";
import {
  AdministrationError,
  featureForbidden,
  unauthorized,
} from "../errors/administration.errors";
import type AdministrationService from "../service/administration.service";
import { isAdministrator } from "../service/administration.service";

type SendError = (
  error: unknown,
  language: string | undefined,
  response: Response,
) => Promise<void>;

const readLanguage = (request: Request): string | undefined => {
  const language = request.query.language;
  if (Array.isArray(language)) return typeof language[0] === "string" ? language[0] : undefined;
  return typeof language === "string" ? language : undefined;
};

const createSendError =
  (messageRepository: MessageRepository): SendError =>
  async (error, language, response) => {
    if (error instanceof AdministrationError) {
      const message = (await messageRepository.getMessage(error.code, language)) ?? error.message;
      response.status(error.httpStatus).json({ code: error.code, message });
      return;
    }
    console.error("!!! Error administration controller :\n", error);
    response.status(500).json({ code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" });
  };

const requireUserId = (request: Request): string => {
  const userId = (request as AuthenticatedRequest).userId;
  if (!userId) throw unauthorized();
  return userId;
};

export const serializeUser = (user: User) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  provider: user.provider.name,
  role: user.rol.name,
  is_administrator: isAdministrator(user),
  is_deleted: user.isDeleted,
  deleted_at: user.deletedAt,
  information: user.information
    ? {
        full_name: user.information.fullName,
        phone: user.information.phone,
        country: user.information.country,
        github_url: user.information.githubUrl,
        gitlab_url: user.information.gitlabUrl,
        linkedin_url: user.information.linkedinUrl,
        business_email: user.information.businessEmail,
      }
    : null,
});

export const requireFeature = (
  feature: string,
  messageRepository: MessageRepository,
): RequestHandler => {
  const sendError = createSendError(messageRepository);
  return async (request, response, next) => {
    if (!(request as AuthenticatedRequest).userId) {
      await sendError(unauthorized(), readLanguage(request), response);
      return;
    }
    const permissions = (request as AuthenticatedRequest).permissions;
    if (!permissions?.includes(feature)) {
      await sendError(featureForbidden(), readLanguage(request), response);
      return;
    }
    next();
  };
};

export default class AdministrationController {
  private readonly sendError: SendError;

  constructor(
    private readonly service: AdministrationService,
    messageRepository: MessageRepository,
  ) {
    this.sendError = createSendError(messageRepository);
  }

  search: RequestHandler = async (request, response) => {
    try {
      requireUserId(request);
      const result = await this.service.search(request.query);
      response.status(200).json({
        items: result.items.map(serializeUser),
        meta: {
          query: result.query,
          page: result.page,
          limit: result.limit,
          total: result.total,
          total_pages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  update: RequestHandler = async (request, response) => {
    try {
      requireUserId(request);
      const updated = await this.service.update(request.params.userId, request.body);
      response.status(200).json(serializeUser(updated));
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  remove: RequestHandler = async (request, response) => {
    try {
      requireUserId(request);
      await this.service.softDelete(request.params.userId);
      response.status(204).send();
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };
}
