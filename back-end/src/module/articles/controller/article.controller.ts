import type { Request, RequestHandler, Response } from "express";
import type { AuthenticatedRequest } from "../../auth/controller/auth.controller";
import type MessageRepository from "../../auth/repository/message.repository";
import {
  ArticleError,
  featureForbidden,
  unauthorized,
  unsupportedMediaType,
} from "../errors/article.errors";
import type ArticleService from "../service/article.service";
import type {
  ArticleDetailResponse,
  ArticleGetResponse,
  ArticleSummaryResponse,
  ArticleTagResponse,
  ArticleTranslationResponse,
  ArticleTranslationSummary,
} from "../service/article.service";

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
    if (error instanceof ArticleError) {
      const message = (await messageRepository.getMessage(error.code, language)) ?? error.message;
      response.status(error.httpStatus).json({ code: error.code, message });
      return;
    }
    console.error("!!! Error article controller :\n", error);
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

export const serializeTags = (tags: ArticleTagResponse[]): ArticleTagResponse[] => tags;

export const serializeTranslation = (
  translation: ArticleTranslationResponse | Omit<ArticleTranslationResponse, "rawMarkdown">,
): Record<string, unknown> => ({
  language: translation.language,
  title: translation.title,
  description: translation.description,
  rendered_html: translation.renderedHtml,
  updated_at: translation.updatedAt,
  ...("rawMarkdown" in translation ? { raw_markdown: translation.rawMarkdown } : {}),
});

const serializeTranslationSummary = (
  translation: ArticleTranslationSummary,
): Record<string, unknown> => ({
  language: translation.language,
  title: translation.title,
  description: translation.description,
  updated_at: translation.updatedAt,
});

export const serializeArticle = (article: ArticleDetailResponse): Record<string, unknown> => ({
  id: article.id,
  tags: serializeTags(article.tags),
  translations: article.translations.map(serializeTranslation),
});

const serializeSummary = (article: ArticleSummaryResponse): Record<string, unknown> => ({
  id: article.id,
  tags: serializeTags(article.tags),
  translation: serializeTranslationSummary(article.translation),
});

const serializeGet = (article: ArticleGetResponse): Record<string, unknown> => ({
  id: article.id,
  tags: serializeTags(article.tags),
  translation: serializeTranslation(article.translation),
});

export default class ArticleController {
  private readonly sendError: SendError;

  constructor(
    private readonly service: ArticleService,
    messageRepository: MessageRepository,
  ) {
    this.sendError = createSendError(messageRepository);
  }

  create: RequestHandler = async (request, response) => {
    try {
      const created = await this.service.create(requireUserId(request), request.body);
      response.status(201).json(serializeArticle(created));
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
        readIfMatch(request),
      );
      response.status(200).json(serializeArticle(updated));
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
      response.status(200).json({
        items: page.items.map(serializeSummary),
        meta: page.meta,
      });
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  get: RequestHandler = async (request, response) => {
    try {
      const article = await this.service.get(
        request.params.userId,
        request.params.id,
        request.query,
      );
      response.set("Cache-Control", "public, max-age=60");
      response.status(200).json(serializeGet(article));
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };
}
