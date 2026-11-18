import type { DataSource } from "typeorm";
import Article from "../../../shared/database/article/article.entity";
import Comment from "../../../shared/database/article/comment.entity";
import User from "../../../shared/database/user/user.entity";

export interface NewComment {
  id: string;
  userId: string;
  articleId: string;
  parentCommentId: string | null;
  comment: string;
}

export interface CommentPageRequest {
  limit: number;
  page: number;
}

export default class CommentRepository {
  constructor(private readonly dataSource: DataSource) {}

  findUser(id: string): Promise<User | null> {
    return this.dataSource.getRepository(User).findOne({ where: { id } });
  }

  findArticle(userId: string, id: string): Promise<Article | null> {
    return this.dataSource.getRepository(Article).findOne({
      where: { id, isDeleted: false, user: { id: userId } },
    });
  }

  findById(id: string): Promise<Comment | null> {
    return this.dataSource.getRepository(Comment).findOne({
      where: { id },
      relations: { user: true },
    });
  }

  async findPage(
    articleId: string,
    request: CommentPageRequest,
  ): Promise<{ items: Comment[]; total: number }> {
    const [items, total] = await this.dataSource.getRepository(Comment).findAndCount({
      where: { articleId },
      relations: { user: true },
      order: { createdAt: "ASC", id: "ASC" },
      skip: (request.page - 1) * request.limit,
      take: request.limit,
    });
    return { items, total };
  }

  async create(input: NewComment): Promise<Comment> {
    const repository = this.dataSource.getRepository(Comment);
    return repository.save(repository.create(input));
  }

  async update(id: string, comment: string): Promise<void> {
    await this.dataSource
      .getRepository(Comment)
      .update({ id }, { comment, updated: true, updatedAt: new Date() });
  }

  async hardDelete(id: string): Promise<void> {
    await this.dataSource.getRepository(Comment).delete({ id });
  }
}
