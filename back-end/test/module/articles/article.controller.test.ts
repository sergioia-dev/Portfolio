import type { Request, RequestHandler, Response } from "express";
import ArticleController, {
  requireFeature,
  requireJson,
  serializeArticle,
} from "../../../src/module/articles/controller/article.controller";
import { ArticleError } from "../../../src/module/articles/errors/article.errors";
import { articleRouter } from "../../../src/module/articles/routes/article.routes";
import type ArticleService from "../../../src/module/articles/service/article.service";
import type MessageRepository from "../../../src/module/auth/repository/message.repository";
import type Jwt from "../../../src/shared/security/jwt/jwt";

const ARTICLE_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const USER_ID = "6c1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";
const TAG_ID = "9a1e3b1e-3a1e-4a1e-9a1e-2f1c9f2e0c3b";
const UPDATED_AT = new Date("2025-01-01T00:00:00.000Z");

const TRANSLATION = {
  language: "EN",
  title: "Title",
  description: "Description",
  rawMarkdown: "# Hi",
  renderedHtml: "<h1>Hi</h1>",
  updatedAt: UPDATED_AT,
};

const DETAIL = {
  id: ARTICLE_ID,
  tags: [{ id: TAG_ID, name: "TypeScript" }],
  translations: [TRANSLATION],
};

const SERIALIZED_TRANSLATION = {
  language: "EN",
  title: "Title",
  description: "Description",
  rendered_html: "<h1>Hi</h1>",
  updated_at: UPDATED_AT,
  raw_markdown: "# Hi",
};

const createService = () => ({
  create: jest.fn().mockResolvedValue(DETAIL),
  update: jest.fn().mockResolvedValue(DETAIL),
  remove: jest.fn().mockResolvedValue(undefined),
  list: jest.fn().mockResolvedValue({ items: [], meta: {} }),
  get: jest.fn().mockResolvedValue({ id: ARTICLE_ID, tags: [], translation: TRANSLATION }),
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
    controller: new ArticleController(service as unknown as ArticleService, messageRepository),
    service,
    messageRepository,
  };
};

test("create responds 201 with the serialized detail", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const request = { body: { translations: [] }, userId: USER_ID };

  await call(controller.create, request as unknown as Request, response);

  expect(service.create).toHaveBeenCalledWith(USER_ID, request.body);
  expect(response.status).toHaveBeenCalledWith(201);
  expect(response.json).toHaveBeenCalledWith({
    id: ARTICLE_ID,
    tags: [{ id: TAG_ID, name: "TypeScript" }],
    translations: [SERIALIZED_TRANSLATION],
  });
});

test("update responds 200 with the serialized detail", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const request = {
    body: { translations: [] },
    params: { id: ARTICLE_ID },
    headers: { "if-match": "2025-01-01T00:00:00.000Z" },
    userId: USER_ID,
  };

  await call(controller.update, request as unknown as Request, response);

  expect(service.update).toHaveBeenCalledWith(
    USER_ID,
    ARTICLE_ID,
    request.body,
    "2025-01-01T00:00:00.000Z",
  );
  expect(response.status).toHaveBeenCalledWith(200);
});

test("remove responds 204 with an empty body", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const request = { params: { id: ARTICLE_ID }, headers: {}, userId: USER_ID };

  await call(controller.remove, request as unknown as Request, response);

  expect(service.remove).toHaveBeenCalledWith(USER_ID, ARTICLE_ID, null);
  expect(response.status).toHaveBeenCalledWith(204);
  expect(response.send).toHaveBeenCalledWith();
});

test("list responds 200 with summaries and a public cache header", async () => {
  const { controller, service } = buildController();
  service.list.mockResolvedValue({
    items: [
      {
        id: ARTICLE_ID,
        tags: [],
        translation: {
          language: "EN",
          title: "Title",
          description: "Description",
          updatedAt: UPDATED_AT,
        },
      },
    ],
    meta: { userId: USER_ID, language: "EN", page: 1, limit: 20, total: 1, total_pages: 1 },
  });
  const response = createResponse();
  const request = { params: { userId: USER_ID }, query: { language: "en" } };

  await call(controller.list, request as unknown as Request, response);

  expect(service.list).toHaveBeenCalledWith(USER_ID, request.query);
  expect(response.set).toHaveBeenCalledWith("Cache-Control", "public, max-age=60");
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith({
    items: [
      {
        id: ARTICLE_ID,
        tags: [],
        translation: {
          language: "EN",
          title: "Title",
          description: "Description",
          updated_at: UPDATED_AT,
        },
      },
    ],
    meta: { userId: USER_ID, language: "EN", page: 1, limit: 20, total: 1, total_pages: 1 },
  });
});

test("get responds 200 with a public cache header", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const request = { params: { userId: USER_ID, id: ARTICLE_ID }, query: { language: "en" } };

  await call(controller.get, request as unknown as Request, response);

  expect(service.get).toHaveBeenCalledWith(USER_ID, ARTICLE_ID, request.query);
  expect(response.set).toHaveBeenCalledWith("Cache-Control", "public, max-age=60");
  expect(response.status).toHaveBeenCalledWith(200);
});

test("get omits the markdown when the service only returns html", async () => {
  const { controller, service } = buildController();
  const { rawMarkdown: _rawMarkdown, ...withoutMarkdown } = TRANSLATION;
  service.get.mockResolvedValue({ id: ARTICLE_ID, tags: [], translation: withoutMarkdown });
  const response = createResponse();

  await call(
    controller.get,
    {
      params: { userId: USER_ID, id: ARTICLE_ID },
      query: { language: "en", only_html: "true" },
    } as unknown as Request,
    response,
  );

  const payload = response.json.mock.calls[0][0] as {
    translation: Record<string, unknown>;
  };
  expect(payload.translation).not.toHaveProperty("raw_markdown");
  expect(payload.translation).toHaveProperty("rendered_html", "<h1>Hi</h1>");
});

test("write handlers respond 401 without an authenticated user", async () => {
  const { controller, service } = buildController();

  for (const handler of [controller.create, controller.update, controller.remove]) {
    const response = createResponse();
    const request = { params: { id: ARTICLE_ID }, headers: {} };

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
  messageRepository.getMessage = jest.fn().mockResolvedValue("Article not found.");
  const response = createResponse();

  await call(
    controller.remove,
    { params: { id: ARTICLE_ID }, headers: {}, userId: USER_ID } as unknown as Request,
    response,
  );

  expect(messageRepository.getMessage).toHaveBeenCalledWith("MSG-10", undefined);
  expect(response.status).toHaveBeenCalledWith(404);
  expect(response.json).toHaveBeenCalledWith({ code: "MSG-10", message: "Article not found." });
});

test("unknown errors respond 500", async () => {
  const { controller, service } = buildController();
  service.create.mockRejectedValue(new Error("boom"));
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  const response = createResponse();

  await call(controller.create, { body: {}, userId: USER_ID } as unknown as Request, response);

  expect(response.status).toHaveBeenCalledWith(500);
  expect(response.json).toHaveBeenCalledWith({
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal Server Error",
  });
  consoleError.mockRestore();
});

test("service errors respond with their status on every handler", async () => {
  const { controller, service } = buildController();
  const error = new ArticleError("MSG-10", 404, "fallback");
  service.update.mockRejectedValue(error);
  service.remove.mockRejectedValue(error);
  service.list.mockRejectedValue(error);
  service.get.mockRejectedValue(error);

  const requests = [
    [controller.update, { params: { id: ARTICLE_ID }, headers: {}, userId: USER_ID }],
    [controller.remove, { params: { id: ARTICLE_ID }, headers: {}, userId: USER_ID }],
    [controller.list, { params: { userId: USER_ID } }],
    [controller.get, { params: { userId: USER_ID, id: ARTICLE_ID } }],
  ] as const;

  for (const [handler, request] of requests) {
    const response = createResponse();

    await call(handler, request as unknown as Request, response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "MSG-10", message: "fallback" }),
    );
  }
});

test("requireFeature lets a permitted request through", async () => {
  const next = jest.fn();
  const response = createResponse();

  await requireFeature("ARTICLE_CREATE", createMessageRepository())(
    { permissions: ["ARTICLE_CREATE"], query: {} } as unknown as Request,
    response,
    next,
  );

  expect(next).toHaveBeenCalledWith();
  expect(response.status).not.toHaveBeenCalled();
});

test("requireFeature responds 403 without the permission", async () => {
  const next = jest.fn();
  const response = createResponse();

  await requireFeature("ARTICLE_CREATE", createMessageRepository())(
    { permissions: [], query: {} } as unknown as Request,
    response,
    next,
  );

  expect(next).not.toHaveBeenCalled();
  expect(response.status).toHaveBeenCalledWith(403);
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ code: "MSG-5" }));
});

test("requireJson accepts application/json with parameters", async () => {
  const next = jest.fn();

  await requireJson(createMessageRepository())(
    {
      headers: { "content-type": "application/json; charset=utf-8" },
      query: {},
    } as unknown as Request,
    createResponse(),
    next,
  );

  expect(next).toHaveBeenCalledWith();
});

test("requireJson responds 415 for another media type", async () => {
  const next = jest.fn();
  const response = createResponse();

  await requireJson(createMessageRepository())(
    { headers: { "content-type": "text/plain" }, query: {} } as unknown as Request,
    response,
    next,
  );

  expect(next).not.toHaveBeenCalled();
  expect(response.status).toHaveBeenCalledWith(415);
  expect(response.json).toHaveBeenCalledWith(
    expect.objectContaining({ code: "UNSUPPORTED_MEDIA_TYPE" }),
  );
});

test("serializeArticle emits the documented snake case payload", () => {
  expect(serializeArticle(DETAIL)).toEqual({
    id: ARTICLE_ID,
    tags: [{ id: TAG_ID, name: "TypeScript" }],
    translations: [SERIALIZED_TRANSLATION],
  });
});

test("articleRouter declares the authenticated and public routes", () => {
  const { controller, messageRepository } = buildController();
  const router = articleRouter(
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
    "post /portfolio/articles",
    "put /portfolio/articles/:id",
    "delete /portfolio/articles/:id",
    "get /users/:userId/portfolio/articles",
    "get /users/:userId/portfolio/articles/:id",
  ]);
});
