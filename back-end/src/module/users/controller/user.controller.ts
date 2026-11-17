import type { Request, RequestHandler, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/controller/auth.controller";
import type MessageRepository from "../../auth/repository/message.repository";
import { UserError, unauthorized, unsupportedMediaType } from "../errors/user.errors";
import type UserService from "../service/user.service";

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
    if (error instanceof UserError) {
      const message = (await messageRepository.getMessage(error.code, language)) ?? error.message;
      response.status(error.httpStatus).json({ code: error.code, message });
      return;
    }
    console.error("!!! Error user controller :\n", error);
    response.status(500).json({ code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" });
  };

const requireUserId = (request: Request): string => {
  const userId = (request as AuthenticatedRequest).userId;
  if (!userId) throw unauthorized();
  return userId;
};

export const requireJson = (messageRepository: MessageRepository): RequestHandler => {
  const sendError = createSendError(messageRepository);
  return async (request, response, next) => {
    if (/^application\/json(\s*;.*)?$/i.test(request.headers["content-type"] ?? "")) {
      next();
      return;
    }
    await sendError(unsupportedMediaType(), readLanguage(request), response);
  };
};

export default class UserController {
  private readonly sendError: SendError;

  constructor(
    private readonly service: UserService,
    messageRepository: MessageRepository,
  ) {
    this.sendError = createSendError(messageRepository);
  }

  get: RequestHandler = async (request, response) => {
    try {
      const profile = await this.service.getMe(requireUserId(request));
      response.status(200).json(profile);
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  update: RequestHandler = async (request, response) => {
    try {
      const profile = await this.service.updateMe(requireUserId(request), request.body);
      response.status(200).json(profile);
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  remove: RequestHandler = async (request, response) => {
    try {
      await this.service.deleteMe(requireUserId(request));
      response.clearCookie("accessToken", { path: "/" });
      response.clearCookie("refreshToken", { path: "/" });
      response.status(204).send();
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };
}
