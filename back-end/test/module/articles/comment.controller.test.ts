import type { Request, RequestHandler, Response } from "express";
import CommentController, {
  serializeComment,
} from "../../../src/module/articles/controller/comment.controller";
import { ArticleError } from "../../../src/module/articles/errors/article.errors";
import { commentRouter } from "../../../src/module/articles/routes/comment.routes";
import type CommentService from "../../../src/module/articles/service/comment.service";
import type MessageRepository from "../../../src/module/auth/repository/message.repository";
import type Jwt from "../../../src/shared/security/jwt/jwt";

const COMMENT_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const ARTICLE_ID = "6c1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const USER_ID = "9a1e3b1e-3a1e-4a1e-9a1e-2f1c9f2e0c3b";

const COMMENT = {
  id: COMMENT_ID,
  articleId: ARTICLE_ID,
  parentCommentId: null,
  userId: USER_ID,
  comment: "Hello",
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updated: false,
  updatedAt: null,
  user: { id: USER_ID, username: "alice" },
};

const SERIALIZED_COMMENT = {
  id: COMMENT_ID,
  article_id: ARTICLE_ID,
  parent_comment: null,
  author: { id: USER_ID, username: "alice" },
  comment: "Hello",
};

const createService = () => ({
  list: jest.fn().mockResolvedValue({ items: [COMMENT], meta: {} }),
  create: jest.fn().mockResolvedValue(COMMENT),
  update: jest.fn().mockResolvedValue(COMMENT),
  remove: jest.fn().mockResolvedValue(undefined),
});

const createMessageRepository = () =>
  ({ getMessage: jest.fn().mockResolvedValue(null) }) as unknown as MessageRepository;

const createUserLookup = () => ({ findById: jest.fn(async () => ({ isDeleted: false })) });

const createResponse = () => {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    set: jest.fn(),
  };
  response.status.mockReturnValue(response);
  return response as unknown as Response & typeof response;
};

const call = (handler: RequestHandler, request: Request, response: Response) => {
  if (!request.query) request.query = {};
  return handler(request, response, jest.fn());
};

const buildController = () => {
  const service = createService();
  const messageRepository = createMessageRepository();
  return {
    controller: new CommentController(service as unknown as CommentService, messageRepository),
    service,
    messageRepository,
  };
};

test("list responds 200 with serialized comments", async () => {
  const { controller, service } = buildController();
  service.list.mockResolvedValue({
    items: [COMMENT],
    meta: { article_id: ARTICLE_ID, page: 1, limit: 50, total: 1, total_pages: 1 },
  });
  const response = createResponse();
  const request = { params: { userId: USER_ID, articleId: ARTICLE_ID }, query: {} };

  await call(controller.list, request as unknown as Request, response);

  expect(service.list).toHaveBeenCalledWith(USER_ID, ARTICLE_ID, request.query);
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith({
    items: [SERIALIZED_COMMENT],
    meta: { article_id: ARTICLE_ID, page: 1, limit: 50, total: 1, total_pages: 1 },
  });
});

test("create responds 201 with the serialized comment", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const request = {
    body: { comment: "Hello" },
    params: { userId: USER_ID, articleId: ARTICLE_ID },
    userId: USER_ID,
  };

  await call(controller.create, request as unknown as Request, response);

  expect(service.create).toHaveBeenCalledWith(USER_ID, USER_ID, ARTICLE_ID, request.body);
  expect(response.status).toHaveBeenCalledWith(201);
  expect(response.json).toHaveBeenCalledWith(SERIALIZED_COMMENT);
});

test("update responds 200 with the serialized comment", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const request = {
    body: { comment: "Edited" },
    params: { userId: USER_ID, articleId: ARTICLE_ID, commentId: COMMENT_ID },
    userId: USER_ID,
  };

  await call(controller.update, request as unknown as Request, response);

  expect(service.update).toHaveBeenCalledWith(
    USER_ID,
    USER_ID,
    ARTICLE_ID,
    COMMENT_ID,
    request.body,
  );
  expect(response.status).toHaveBeenCalledWith(200);
});

test("remove responds 204 with an empty body", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const request = {
    params: { userId: USER_ID, articleId: ARTICLE_ID, commentId: COMMENT_ID },
    userId: USER_ID,
  };

  await call(controller.remove, request as unknown as Request, response);

  expect(service.remove).toHaveBeenCalledWith(USER_ID, USER_ID, ARTICLE_ID, COMMENT_ID);
  expect(response.status).toHaveBeenCalledWith(204);
  expect(response.send).toHaveBeenCalledWith();
});

test("write handlers respond 401 without an authenticated user", async () => {
  const { controller, service } = buildController();

  for (const handler of [controller.create, controller.update, controller.remove]) {
    const response = createResponse();
    const request = { params: { userId: USER_ID, articleId: ARTICLE_ID, commentId: COMMENT_ID } };

    await call(handler, request as unknown as Request, response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ code: "UNAUTHORIZED" }));
  }
  expect(service.create).not.toHaveBeenCalled();
  expect(service.update).not.toHaveBeenCalled();
  expect(service.remove).not.toHaveBeenCalled();
});

test("errors are localized through the message repository", async () => {
  const { controller, service, messageRepository } = buildController();
  service.remove.mockRejectedValue(new ArticleError("MSG-10", 404, "fallback"));
  messageRepository.getMessage = jest.fn().mockResolvedValue("Comment not found.");
  const response = createResponse();

  await call(
    controller.remove,
    {
      params: { userId: USER_ID, articleId: ARTICLE_ID, commentId: COMMENT_ID },
      userId: USER_ID,
    } as unknown as Request,
    response,
  );

  expect(messageRepository.getMessage).toHaveBeenCalledWith("MSG-10", undefined);
  expect(response.status).toHaveBeenCalledWith(404);
  expect(response.json).toHaveBeenCalledWith({ code: "MSG-10", message: "Comment not found." });
});

test("unknown errors respond 500", async () => {
  const { controller, service } = buildController();
  service.create.mockRejectedValue(new Error("boom"));
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  const response = createResponse();

  await call(
    controller.create,
    {
      body: {},
      params: { userId: USER_ID, articleId: ARTICLE_ID },
      userId: USER_ID,
    } as unknown as Request,
    response,
  );

  expect(response.status).toHaveBeenCalledWith(500);
  expect(response.json).toHaveBeenCalledWith({
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal Server Error",
  });
  consoleError.mockRestore();
});

test("serializeComment falls back to a null username", () => {
  expect(serializeComment({ ...COMMENT, user: { id: USER_ID, username: null } } as never)).toEqual({
    ...SERIALIZED_COMMENT,
    author: { id: USER_ID, username: null },
  });
});

test("commentRouter declares the public and protected routes", () => {
  const { controller, messageRepository } = buildController();
  const router = commentRouter(
    controller,
    {} as unknown as Jwt,
    messageRepository,
    createUserLookup(),
  );
  const stack = (
    router as unknown as { stack: { route?: { path: string; methods: Record<string, boolean> } }[] }
  ).stack;

  expect(
    stack
      .filter((layer) => layer.route)
      .map((layer) => `${Object.keys(layer.route?.methods ?? {})[0]} ${layer.route?.path}`),
  ).toEqual([
    "get /users/:userId/portfolio/articles/:articleId/comments",
    "post /users/:userId/portfolio/articles/:articleId/comments",
    "patch /users/:userId/portfolio/articles/:articleId/comments/:commentId",
    "delete /users/:userId/portfolio/articles/:articleId/comments/:commentId",
  ]);
});
