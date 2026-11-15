import type { Request, RequestHandler, Response } from "express";
import type { AuthenticatedRequest } from "../../../auth/controller/auth.controller";
import type MessageRepository from "../../../auth/repository/message.repository";
import { ExperienceError, featureForbidden, unauthorized } from "../errors/experience.errors";
import type ExperienceService from "../service/experience.service";

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

const readIfMatch = (request: Request): string | null => {
  const header = request.headers["if-match"];
  return typeof header === "string" && header !== "" ? header : null;
};

const createSendError =
  (messageRepository: MessageRepository): SendError =>
  async (error, language, response) => {
    if (error instanceof ExperienceError) {
      const message = (await messageRepository.getMessage(error.code, language)) ?? error.message;
      response.status(error.httpStatus).json({ code: error.code, message });
      return;
    }
    console.error("!!! Error experience controller :\n", error);
    response.status(500).json({ code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" });
  };

const requireUserId = (request: Request): string => {
  const userId = (request as AuthenticatedRequest).userId;
  if (!userId) throw unauthorized();
  return userId;
};

export const requireFeature = (
  feature: string,
  messageRepository: MessageRepository,
): RequestHandler => {
  const sendError = createSendError(messageRepository);
  return async (request, response, next) => {
    const permissions = (request as AuthenticatedRequest).permissions;
    if (!permissions?.includes(feature)) {
      await sendError(featureForbidden(), readLanguage(request), response);
      return;
    }
    next();
  };
};

export default class ExperienceController {
  private readonly sendError: SendError;

  constructor(
    private readonly service: ExperienceService,
    messageRepository: MessageRepository,
  ) {
    this.sendError = createSendError(messageRepository);
  }

  create: RequestHandler = async (request, response) => {
    try {
      const created = await this.service.create(requireUserId(request), request.body);
      response.status(201).json(created);
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  update: RequestHandler = async (request, response) => {
    try {
      const updated = await this.service.update(
        requireUserId(request),
        request.params.id,
        request.body,
      );
      response.status(200).json(updated);
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  remove: RequestHandler = async (request, response) => {
    try {
      await this.service.remove(requireUserId(request), request.params.id, readIfMatch(request));
      response.status(204).send();
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  list: RequestHandler = async (request, response) => {
    try {
      const page = await this.service.list(request.params.userId, request.query);
      response.set("Cache-Control", "public, max-age=60");
      response.status(200).json(page);
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  get: RequestHandler = async (request, response) => {
    try {
      const experience = await this.service.get(
        request.params.userId,
        request.params.id,
        request.query,
      );
      response.set("Cache-Control", "public, max-age=60");
      response.status(200).json(experience);
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };
}
