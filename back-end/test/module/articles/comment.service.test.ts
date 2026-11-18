import type CommentRepository from "../../../src/module/articles/repository/comment.repository";
import CommentService from "../../../src/module/articles/service/comment.service";
import type Comment from "../../../src/shared/database/article/comment.entity";

const USER_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const OTHER_USER_ID = "3b1e3a1e-0c3b-4a1e-9a1e-2f1c9f2e0c3b";
const ARTICLE_ID = "9b1e3a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const COMMENT_ID = "1e3a1e3b-1e3a-4a1e-9a1e-2f1c9f2e0c3b";
const PARENT_ID = "4a1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const CREATED_AT = new Date("2025-01-01T00:00:00.000Z");

const author = { id: USER_ID, username: "writer" };
const comment = (
  overrides: {
    id?: string;
    userId?: string;
    articleId?: string;
    parentCommentId?: string | null;
    comment?: string;
  } = {},
): Comment =>
  ({
    id: COMMENT_ID,
    userId: USER_ID,
    articleId: ARTICLE_ID,
    parentCommentId: null,
    comment: "Hello",
    createdAt: CREATED_AT,
    updated: false,
    updatedAt: null,
    user: author,
    ...overrides,
  }) as unknown as Comment;

const createRepository = () => ({
  findUser: jest.fn(),
  findArticle: jest.fn(),
  findById: jest.fn(),
  findPage: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  hardDelete: jest.fn(),
});

let repository: ReturnType<typeof createRepository>;
let service: CommentService;

beforeEach(() => {
  repository = createRepository();
  service = new CommentService(repository as unknown as CommentRepository);
});

test("list returns a page of comments with pagination meta", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findArticle.mockResolvedValue({ id: ARTICLE_ID });
  repository.findPage.mockResolvedValue({ items: [comment()], total: 2 });

  const result = await service.list(USER_ID, ARTICLE_ID, { limit: "10", page: "1" });

  expect(repository.findPage).toHaveBeenCalledWith(ARTICLE_ID, { limit: 10, page: 1 });
  expect(result).toEqual({
    items: [comment()],
    meta: { article_id: ARTICLE_ID, page: 1, limit: 10, total: 2, total_pages: 1 },
  });
});

test("list rejects invalid paging", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findArticle.mockResolvedValue({ id: ARTICLE_ID });

  await expect(service.list(USER_ID, ARTICLE_ID, { limit: "0" })).rejects.toMatchObject({
    code: "INVALID_QUERY_PARAM",
  });
});

test("list rejects deleted owners", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: true });

  await expect(service.list(USER_ID, ARTICLE_ID, {})).rejects.toMatchObject({ code: "MSG-4" });
});

test("list rejects missing articles", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findArticle.mockResolvedValue(null);

  await expect(service.list(USER_ID, ARTICLE_ID, {})).rejects.toMatchObject({ code: "MSG-10" });
});

test("list validates identifiers", async () => {
  await expect(service.list("nope", ARTICLE_ID, {})).rejects.toMatchObject({
    code: "INVALID_USER_ID",
  });

  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  await expect(service.list(USER_ID, "nope", {})).rejects.toMatchObject({ code: "INVALID_ID" });
});

test("create stores a root comment with its author", async () => {
  repository.findArticle.mockResolvedValue({ id: ARTICLE_ID });
  repository.findUser.mockResolvedValue(author);
  repository.create.mockImplementation(async (input) => comment(input));

  const result = await service.create(USER_ID, USER_ID, ARTICLE_ID, { comment: "Hello" });

  expect(repository.create).toHaveBeenCalledWith({
    id: expect.any(String),
    userId: USER_ID,
    articleId: ARTICLE_ID,
    parentCommentId: null,
    comment: "Hello",
  });
  expect(result.user).toEqual(author);
});

test("create stores a reply when the parent belongs to the article", async () => {
  repository.findUser.mockResolvedValue(author);
  repository.findArticle.mockResolvedValue({ id: ARTICLE_ID });
  repository.findById.mockResolvedValue(comment({ id: PARENT_ID }));
  repository.create.mockImplementation(async (input) => comment(input));

  await service.create(OTHER_USER_ID, USER_ID, ARTICLE_ID, {
    comment: "Reply",
    parent_comment: PARENT_ID,
  });

  expect(repository.create).toHaveBeenCalledWith(
    expect.objectContaining({ parentCommentId: PARENT_ID, userId: OTHER_USER_ID }),
  );
});

test("create rejects missing parents", async () => {
  repository.findUser.mockResolvedValue(author);
  repository.findArticle.mockResolvedValue({ id: ARTICLE_ID });
  repository.findById.mockResolvedValue(null);

  await expect(
    service.create(USER_ID, USER_ID, ARTICLE_ID, {
      comment: "Reply",
      parent_comment: PARENT_ID,
    }),
  ).rejects.toMatchObject({ code: "MSG-10" });
  expect(repository.create).not.toHaveBeenCalled();
});

test("create rejects parents from another article", async () => {
  repository.findUser.mockResolvedValue(author);
  repository.findArticle.mockResolvedValue({ id: ARTICLE_ID });
  repository.findById.mockResolvedValue(comment({ articleId: OTHER_USER_ID }));

  await expect(
    service.create(USER_ID, USER_ID, ARTICLE_ID, {
      comment: "Reply",
      parent_comment: PARENT_ID,
    }),
  ).rejects.toMatchObject({ code: "MSG-10" });
});

test("create rejects missing authors", async () => {
  repository.findUser
    .mockResolvedValueOnce({ id: USER_ID, isDeleted: false })
    .mockResolvedValueOnce(null);
  repository.findArticle.mockResolvedValue({ id: ARTICLE_ID });

  await expect(
    service.create(USER_ID, USER_ID, ARTICLE_ID, { comment: "Hello" }),
  ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
});

test("create rejects invalid bodies", async () => {
  repository.findUser.mockResolvedValue(author);
  repository.findArticle.mockResolvedValue({ id: ARTICLE_ID });

  await expect(service.create(USER_ID, USER_ID, ARTICLE_ID, {})).rejects.toMatchObject({
    code: "MISSING_FIELD",
  });
});

test("update edits a comment owned by the actor", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findArticle.mockResolvedValue({ id: ARTICLE_ID });
  repository.findById
    .mockResolvedValueOnce(comment())
    .mockResolvedValueOnce(comment({ comment: "Edited" }));
  repository.update.mockResolvedValue(undefined);

  const result = await service.update(USER_ID, USER_ID, ARTICLE_ID, COMMENT_ID, {
    comment: "Edited",
  });

  expect(repository.update).toHaveBeenCalledWith(COMMENT_ID, "Edited");
  expect(result.comment).toBe("Edited");
});

test("update rejects comments written by someone else", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findArticle.mockResolvedValue({ id: ARTICLE_ID });
  repository.findById.mockResolvedValue(comment({ userId: OTHER_USER_ID }));

  await expect(
    service.update(USER_ID, USER_ID, ARTICLE_ID, COMMENT_ID, { comment: "Edited" }),
  ).rejects.toMatchObject({ code: "MSG-5" });
  expect(repository.update).not.toHaveBeenCalled();
});

test("update rejects comments from another article", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findArticle.mockResolvedValue({ id: ARTICLE_ID });
  repository.findById.mockResolvedValue(comment({ articleId: OTHER_USER_ID }));

  await expect(
    service.update(USER_ID, USER_ID, ARTICLE_ID, COMMENT_ID, { comment: "Edited" }),
  ).rejects.toMatchObject({ code: "MSG-10" });
});

test("update rejects missing comments", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findArticle.mockResolvedValue({ id: ARTICLE_ID });
  repository.findById.mockResolvedValue(null);

  await expect(
    service.update(USER_ID, USER_ID, ARTICLE_ID, COMMENT_ID, { comment: "Edited" }),
  ).rejects.toMatchObject({ code: "MSG-10" });
});

test("update rejects malformed bodies and identifiers", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findArticle.mockResolvedValue({ id: ARTICLE_ID });
  repository.findById.mockResolvedValue(comment());

  await expect(service.update(USER_ID, USER_ID, ARTICLE_ID, COMMENT_ID, {})).rejects.toMatchObject({
    code: "MISSING_FIELD",
  });
  await expect(
    service.update(USER_ID, USER_ID, ARTICLE_ID, "nope", { comment: "Edited" }),
  ).rejects.toMatchObject({ code: "INVALID_ID" });
});

test("remove deletes the actor's own comment", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findArticle.mockResolvedValue({ id: ARTICLE_ID });
  repository.findById.mockResolvedValue(comment());
  repository.hardDelete.mockResolvedValue(undefined);

  await service.remove(USER_ID, USER_ID, ARTICLE_ID, COMMENT_ID);

  expect(repository.hardDelete).toHaveBeenCalledWith(COMMENT_ID);
});

test("remove lets the article owner delete any comment", async () => {
  repository.findUser.mockResolvedValue({ id: USER_ID, isDeleted: false });
  repository.findArticle.mockResolvedValue({ id: ARTICLE_ID });
  repository.findById.mockResolvedValue(comment({ userId: OTHER_USER_ID }));
  repository.hardDelete.mockResolvedValue(undefined);

  await service.remove(USER_ID, USER_ID, ARTICLE_ID, COMMENT_ID);

  expect(repository.hardDelete).toHaveBeenCalledWith(COMMENT_ID);
});
