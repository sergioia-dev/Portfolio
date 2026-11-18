import type { Request, RequestHandler, Response } from "express";
import type Comment from "../../../shared/database/article/comment.entity";
import type { AuthenticatedRequest } from "../../auth/controller/auth.controller";
import type MessageRepository from "../../auth/repository/message.repository";
import { ArticleError, unauthorized } from "../errors/article.errors";
import type CommentService from "../service/comment.service";

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
    if (error instanceof ArticleError) {
      const message = (await messageRepository.getMessage(error.code, language)) ?? error.message;
      response.status(error.httpStatus).json({ code: error.code, message });
      return;
    }
    console.error("!!! Error comment controller :\n", error);
    response.status(500).json({ code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" });
  };

const requireUserId = (request: Request): string => {
  const userId = (request as AuthenticatedRequest).userId;
  if (!userId) throw unauthorized();
  return userId;
};

export const serializeComment = (comment: Comment): Record<string, unknown> => ({
  id: comment.id,
  article_id: comment.articleId,
  parent_comment: comment.parentCommentId,
  author: { id: comment.user.id, username: comment.user.username ?? null },
  comment: comment.comment,
});

export default class CommentController {
  private readonly sendError: SendError;

  constructor(
    private readonly service: CommentService,
    messageRepository: MessageRepository,
  ) {
    this.sendError = createSendError(messageRepository);
  }

  list: RequestHandler = async (request, response) => {
    try {
      const page = await this.service.list(
        request.params.userId,
        request.params.articleId,
        request.query,
      );
      response.status(200).json({ items: page.items.map(serializeComment), meta: page.meta });
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  create: RequestHandler = async (request, response) => {
    try {
      const created = await this.service.create(
        requireUserId(request),
        request.params.userId,
        request.params.articleId,
        request.body,
      );
      response.status(201).json(serializeComment(created));
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  update: RequestHandler = async (request, response) => {
    try {
      const updated = await this.service.update(
        requireUserId(request),
        request.params.userId,
        request.params.articleId,
        request.params.commentId,
        request.body,
      );
      response.status(200).json(serializeComment(updated));
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  remove: RequestHandler = async (request, response) => {
    try {
      await this.service.remove(
        requireUserId(request),
        request.params.userId,
        request.params.articleId,
        request.params.commentId,
      );
      response.status(204).send();
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };
}
