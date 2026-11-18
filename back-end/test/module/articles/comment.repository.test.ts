import type { DataSource } from "typeorm";
import CommentRepository from "../../../src/module/articles/repository/comment.repository";
import Article from "../../../src/shared/database/article/article.entity";
import Comment from "../../../src/shared/database/article/comment.entity";
import User from "../../../src/shared/database/user/user.entity";

const COMMENT_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const ARTICLE_ID = "6c1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const USER_ID = "9a1e3b1e-3a1e-4a1e-9a1e-2f1c9f2e0c3b";

const createRepositories = () => {
  const repositories = {
    [User.name]: { findOne: jest.fn().mockResolvedValue({ id: USER_ID }) },
    [Article.name]: { findOne: jest.fn().mockResolvedValue({ id: ARTICLE_ID }) },
    [Comment.name]: {
      findOne: jest.fn().mockResolvedValue({ id: COMMENT_ID }),
      findAndCount: jest.fn().mockResolvedValue([[{ id: COMMENT_ID }], 1]),
      create: jest.fn((input) => input),
      save: jest.fn(async (input) => input),
      update: jest.fn(async () => ({ affected: 1 })),
      delete: jest.fn(async () => ({ affected: 1 })),
    },
  };
  const getRepository = jest.fn((entity: { name: string }) => repositories[entity.name]);
  const dataSource = { getRepository } as unknown as DataSource;

  return { repository: new CommentRepository(dataSource), repositories };
};

test("findUser returns the user", async () => {
  const { repository, repositories } = createRepositories();

  await expect(repository.findUser(USER_ID)).resolves.toEqual({ id: USER_ID });
  expect(repositories[User.name].findOne).toHaveBeenCalledWith({ where: { id: USER_ID } });
});

test("findArticle only loads active articles owned by the user", async () => {
  const { repository, repositories } = createRepositories();

  await repository.findArticle(USER_ID, ARTICLE_ID);

  expect(repositories[Article.name].findOne).toHaveBeenCalledWith({
    where: { id: ARTICLE_ID, isDeleted: false, user: { id: USER_ID } },
  });
});

test("findById loads the comment author", async () => {
  const { repository, repositories } = createRepositories();

  await repository.findById(COMMENT_ID);

  expect(repositories[Comment.name].findOne).toHaveBeenCalledWith({
    where: { id: COMMENT_ID },
    relations: { user: true },
  });
});

test("findPage pages the comments of an article chronologically", async () => {
  const { repository, repositories } = createRepositories();

  await expect(repository.findPage(ARTICLE_ID, { limit: 10, page: 3 })).resolves.toEqual({
    items: [{ id: COMMENT_ID }],
    total: 1,
  });
  expect(repositories[Comment.name].findAndCount).toHaveBeenCalledWith({
    where: { articleId: ARTICLE_ID },
    relations: { user: true },
    order: { createdAt: "ASC", id: "ASC" },
    skip: 20,
    take: 10,
  });
});

test("create saves the comment row", async () => {
  const { repository, repositories } = createRepositories();

  await repository.create({
    id: COMMENT_ID,
    userId: USER_ID,
    articleId: ARTICLE_ID,
    parentCommentId: null,
    comment: "Hello",
  });

  expect(repositories[Comment.name].create).toHaveBeenCalledWith({
    id: COMMENT_ID,
    userId: USER_ID,
    articleId: ARTICLE_ID,
    parentCommentId: null,
    comment: "Hello",
  });
  expect(repositories[Comment.name].save).toHaveBeenCalledTimes(1);
});

test("update stores the edit flag and timestamp", async () => {
  const { repository, repositories } = createRepositories();

  await repository.update(COMMENT_ID, "Edited");

  expect(repositories[Comment.name].update).toHaveBeenCalledWith(
    { id: COMMENT_ID },
    { comment: "Edited", updated: true, updatedAt: expect.any(Date) },
  );
});

test("hardDelete deletes the comment row", async () => {
  const { repository, repositories } = createRepositories();

  await repository.hardDelete(COMMENT_ID);

  expect(repositories[Comment.name].delete).toHaveBeenCalledWith({ id: COMMENT_ID });
});
