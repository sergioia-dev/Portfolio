import { randomUUID } from "node:crypto";
import type Comment from "../../../shared/database/article/comment.entity";
import {
  articleNotFound,
  commentNotFound,
  notCommentAuthor,
  notCommentOwner,
  unauthorized,
  userNotFound,
} from "../errors/article.errors";
import type CommentRepository from "../repository/comment.repository";
import { validateArticleId, validateUserId } from "../validators/article.validators";
import type { CommentPaging } from "../validators/comment.validators";
import {
  validateCommentBody,
  validateCommentId,
  validateCommentPaging,
  validateCommentUpdate,
} from "../validators/comment.validators";

export interface CommentPage {
  items: Comment[];
  meta: {
    article_id: string;
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export default class CommentService {
  constructor(private readonly repository: CommentRepository) {}

  async list(ownerId: string, articleId: string, query: unknown): Promise<CommentPage> {
    await this.findActiveArticle(ownerId, articleId);

    const paging = this.unwrap(validateCommentPaging(query));
    const page = await this.repository.findPage(articleId, paging);
    return { items: page.items, meta: this.toMeta(articleId, paging, page.total) };
  }

  async create(
    actorId: string,
    ownerId: string,
    articleId: string,
    body: unknown,
  ): Promise<Comment> {
    await this.findActiveArticle(ownerId, articleId);

    const input = this.unwrap(validateCommentBody(body));
    if (input.parentCommentId !== null) {
      const parent = await this.repository.findById(input.parentCommentId);
      if (parent === null || parent.articleId !== articleId) throw commentNotFound();
    }

    const author = await this.repository.findUser(actorId);
    if (author === null) throw unauthorized();

    const created = await this.repository.create({
      id: randomUUID(),
      userId: actorId,
      articleId,
      parentCommentId: input.parentCommentId,
      comment: input.comment,
    });
    created.user = author;
    return created;
  }

  async update(
    actorId: string,
    ownerId: string,
    articleId: string,
    commentId: string,
    body: unknown,
  ): Promise<Comment> {
    const comment = await this.findComment(ownerId, articleId, commentId);
    if (comment.userId !== actorId) throw notCommentAuthor();

    const input = this.unwrap(validateCommentUpdate(body));
    await this.repository.update(commentId, input);

    const updated = await this.repository.findById(commentId);
    if (updated === null) throw commentNotFound();
    return updated;
  }

  async remove(
    actorId: string,
    ownerId: string,
    articleId: string,
    commentId: string,
  ): Promise<void> {
    const comment = await this.findComment(ownerId, articleId, commentId);
    if (comment.userId !== actorId && actorId !== ownerId) throw notCommentOwner();
    await this.repository.hardDelete(commentId);
  }

  private async findActiveArticle(ownerId: string, articleId: string): Promise<void> {
    validateUserId(ownerId);
    validateArticleId(articleId);
    const user = await this.repository.findUser(ownerId);
    if (user === null || user.isDeleted) throw userNotFound();
    const article = await this.repository.findArticle(ownerId, articleId);
    if (article === null) throw articleNotFound();
  }

  private async findComment(
    ownerId: string,
    articleId: string,
    commentId: string,
  ): Promise<Comment> {
    validateCommentId(commentId);
    await this.findActiveArticle(ownerId, articleId);
    const comment = await this.repository.findById(commentId);
    if (comment === null || comment.articleId !== articleId) throw commentNotFound();
    return comment;
  }

  private unwrap<T>(result: { value: T } | { error: Error }): T {
    if ("error" in result) throw result.error;
    return result.value;
  }

  private toMeta(articleId: string, paging: CommentPaging, total: number): CommentPage["meta"] {
    return {
      article_id: articleId,
      page: paging.page,
      limit: paging.limit,
      total,
      total_pages: Math.ceil(total / paging.limit),
    };
  }
}
