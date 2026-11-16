import type { Request, RequestHandler, Response } from "express";
import multer from "multer";
import type Tag from "../../../../shared/database/tag/tag.entity";
import type { AuthenticatedRequest } from "../../../auth/controller/auth.controller";
import type MessageRepository from "../../../auth/repository/message.repository";
import {
  featureForbidden,
  invalidImage,
  TagError,
  unauthorized,
  unsupportedMediaType,
} from "../errors/tag.errors";
import type TagService from "../service/tag.service";

type SendError = (
  error: unknown,
  language: string | undefined,
  response: Response,
) => Promise<void>;

const MAX_IMAGE_BYTES = 256 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
}).single("image");

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
    if (error instanceof TagError) {
      const message = (await messageRepository.getMessage(error.code, language)) ?? error.message;
      response.status(error.httpStatus).json({ code: error.code, message });
      return;
    }
    console.error("!!! Error tag controller :\n", error);
    response.status(500).json({ code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" });
  };

const requireUserId = (request: Request): string => {
  const userId = (request as AuthenticatedRequest).userId;
  if (!userId) throw unauthorized();
  return userId;
};

const serialize = (tag: Tag) => ({
  id: tag.id,
  name: tag.name,
  filterable: tag.filterable,
  image_url: tag.imageUrl,
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
      await sendError(featureForbidden(feature), readLanguage(request), response);
      return;
    }
    next();
  };
};

export default class TagController {
  private readonly sendError: SendError;

  constructor(
    private readonly service: TagService,
    messageRepository: MessageRepository,
  ) {
    this.sendError = createSendError(messageRepository);
  }

  parseMultipart: RequestHandler = (request, response, next) => {
    if (!request.is("multipart/form-data")) {
      void this.sendError(unsupportedMediaType(), readLanguage(request), response);
      return;
    }
    upload(request, response, (error) => {
      if (error) {
        void this.sendError(invalidImage(), readLanguage(request), response);
        return;
      }
      next();
    });
  };

  create: RequestHandler = async (request, response) => {
    try {
      const created = await this.service.create(requireUserId(request), request.body, request.file);
      response.status(201).json(serialize(created));
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  update: RequestHandler = async (request, response) => {
    try {
      const updated = await this.service.update(
        requireUserId(request),
        request.params.id,
        readIfMatch(request),
        request.body,
        request.file,
      );
      response.status(200).json(serialize(updated));
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  remove: RequestHandler = async (request, response) => {
    try {
      await this.service.remove(requireUserId(request), request.params.id);
      response.status(204).send();
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  list: RequestHandler = async (request, response) => {
    try {
      const result = await this.service.list(request.params.userId, request.query);
      response.set("Cache-Control", "public, max-age=60");
      response.status(200).json({
        items: result.items.map(serialize),
        meta: {
          filterable: result.filterable,
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

  get: RequestHandler = async (request, response) => {
    try {
      const tag = await this.service.get(request.params.userId, request.params.id);
      response.set("Cache-Control", "public, max-age=60");
      response.status(200).json(serialize(tag));
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };
}
