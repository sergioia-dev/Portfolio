import type { Request, RequestHandler, Response } from "express";
import multer from "multer";
import type Certification from "../../../../shared/database/certification/certification.entity";
import type { AuthenticatedRequest } from "../../../auth/controller/auth.controller";
import type MessageRepository from "../../../auth/repository/message.repository";
import {
  CertificationError,
  featureForbidden,
  invalidFormat,
  unauthorized,
  unsupportedMediaType,
} from "../errors/certification.errors";
import type CertificationService from "../service/certification.service";

type SendError = (
  error: unknown,
  language: string | undefined,
  response: Response,
) => Promise<void>;

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_BYTES },
}).fields([{ name: "document", maxCount: 1 }]);

const readLanguage = (request: Request): string | undefined => {
  const language = request.query.language;
  if (Array.isArray(language)) return typeof language[0] === "string" ? language[0] : undefined;
  return typeof language === "string" ? language : undefined;
};

const createSendError =
  (messageRepository: MessageRepository): SendError =>
  async (error, language, response) => {
    if (error instanceof CertificationError) {
      const message = (await messageRepository.getMessage(error.code, language)) ?? error.message;
      response.status(error.httpStatus).json({ code: error.code, message });
      return;
    }
    console.error("!!! Error certification controller :\n", error);
    response.status(500).json({ code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" });
  };

const requireUserId = (request: Request): string => {
  const userId = (request as AuthenticatedRequest).userId;
  if (!userId) throw unauthorized();
  return userId;
};

const readDocument = (request: Request): Buffer | undefined => {
  const files = request.files;
  if (files == null || Array.isArray(files)) {
    return undefined;
  }
  return files.document?.[0]?.buffer;
};

const serialize = (certification: Certification) => ({
  id: certification.id,
  title: certification.title,
  description: certification.description,
  document_url: certification.documentUrl,
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

export default class CertificationController {
  private readonly sendError: SendError;

  constructor(
    private readonly service: CertificationService,
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
        void this.sendError(invalidFormat(), readLanguage(request), response);
        return;
      }
      next();
    });
  };

  create: RequestHandler = async (request, response) => {
    try {
      const created = await this.service.create(
        requireUserId(request),
        request.body,
        readDocument(request),
      );
      response.status(201).json(serialize(created));
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  update: RequestHandler = async (request, response) => {
    try {
      const updated = await this.service.update(
        requireUserId(request),
        request.params.certificationId,
        request.body,
        readDocument(request),
      );
      response.status(200).json(serialize(updated));
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  remove: RequestHandler = async (request, response) => {
    try {
      await this.service.remove(requireUserId(request), request.params.certificationId);
      response.status(204).send();
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  list: RequestHandler = async (request, response) => {
    try {
      const result = await this.service.list(request.params.userId, request.query);
      response.status(200).json({
        items: result.items.map(serialize),
        page: result.page,
        limit: result.limit,
        total: result.total,
      });
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  get: RequestHandler = async (request, response) => {
    try {
      const certification = await this.service.get(
        request.params.userId,
        request.params.certificationId,
      );
      response.status(200).json(serialize(certification));
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };
}
