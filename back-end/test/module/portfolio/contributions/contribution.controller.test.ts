import type { Request, RequestHandler, Response } from "express";
import type MessageRepository from "../../../../src/module/auth/repository/message.repository";
import ContributionController, {
  requireFeature,
  requireJson,
} from "../../../../src/module/portfolio/contributions/controller/contribution.controller";
import { ContributionError } from "../../../../src/module/portfolio/contributions/errors/contribution.errors";
import { contributionRouter } from "../../../../src/module/portfolio/contributions/routes/contribution.routes";
import type ContributionService from "../../../../src/module/portfolio/contributions/service/contribution.service";
import type Jwt from "../../../../src/shared/security/jwt/jwt";

const CONTRIBUTION_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";
const USER_ID = "6c1e9a1e-3b1e-4a1e-9a1e-2f1c9f2e0c3b";

const RESPONSE_BODY = {
  id: CONTRIBUTION_ID,
  project_url: "https://github.com/user/repo",
  pull_request_url: null,
  translations: [{ language: "EN", title: "Title", description: "Description" }],
};

const createService = () => ({
  create: jest.fn().mockResolvedValue(RESPONSE_BODY),
  update: jest.fn().mockResolvedValue(RESPONSE_BODY),
  remove: jest.fn().mockResolvedValue(undefined),
  list: jest.fn().mockResolvedValue({ items: [], meta: {} }),
  get: jest.fn().mockResolvedValue(RESPONSE_BODY),
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
    controller: new ContributionController(
      service as unknown as ContributionService,
      messageRepository,
    ),
    service,
    messageRepository,
  };
};

test("create responds 201 with the detail", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const request = { body: { project_url: "https://github.com/user/repo" }, userId: USER_ID };

  await call(controller.create, request as unknown as Request, response);

  expect(service.create).toHaveBeenCalledWith(USER_ID, request.body);
  expect(response.status).toHaveBeenCalledWith(201);
  expect(response.json).toHaveBeenCalledWith(RESPONSE_BODY);
});

test("update responds 200", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const request = {
    body: { project_url: "https://github.com/user/repo" },
    params: { id: CONTRIBUTION_ID },
    userId: USER_ID,
  };

  await call(controller.update, request as unknown as Request, response);

  expect(service.update).toHaveBeenCalledWith(USER_ID, CONTRIBUTION_ID, request.body);
  expect(response.status).toHaveBeenCalledWith(200);
});

test("remove responds 204 with an empty body", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const request = { params: { id: CONTRIBUTION_ID }, userId: USER_ID };

  await call(controller.remove, request as unknown as Request, response);

  expect(service.remove).toHaveBeenCalledWith(USER_ID, CONTRIBUTION_ID);
  expect(response.status).toHaveBeenCalledWith(204);
  expect(response.send).toHaveBeenCalledWith();
});

test("list responds 200 with a public cache header", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const request = { params: { userId: USER_ID }, query: { language: "en" } };

  await call(controller.list, request as unknown as Request, response);

  expect(service.list).toHaveBeenCalledWith(USER_ID, request.query);
  expect(response.set).toHaveBeenCalledWith("Cache-Control", "public, max-age=60");
  expect(response.status).toHaveBeenCalledWith(200);
});

test("get responds 200 with a public cache header", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const request = {
    params: { userId: USER_ID, id: CONTRIBUTION_ID },
    query: { language: "en" },
  };

  await call(controller.get, request as unknown as Request, response);

  expect(service.get).toHaveBeenCalledWith(USER_ID, CONTRIBUTION_ID, request.query);
  expect(response.set).toHaveBeenCalledWith("Cache-Control", "public, max-age=60");
  expect(response.status).toHaveBeenCalledWith(200);
});

test("write handlers respond 401 without an authenticated user", async () => {
  const { controller, service } = buildController();

  for (const handler of [controller.create, controller.update, controller.remove]) {
    const response = createResponse();
    const request = { params: { id: CONTRIBUTION_ID }, headers: {} };

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
  service.remove.mockRejectedValue(new ContributionError("MSG-10", 404, "fallback"));
  messageRepository.getMessage = jest.fn().mockResolvedValue("Contribution not found.");
  const response = createResponse();

  await call(
    controller.remove,
    { params: { id: CONTRIBUTION_ID }, headers: {}, userId: USER_ID } as unknown as Request,
    response,
  );

  expect(messageRepository.getMessage).toHaveBeenCalledWith("MSG-10", undefined);
  expect(response.status).toHaveBeenCalledWith(404);
  expect(response.json).toHaveBeenCalledWith({
    code: "MSG-10",
    message: "Contribution not found.",
  });
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

test("requireFeature lets a permitted request through", async () => {
  const next = jest.fn();
  const response = createResponse();

  await requireFeature("PORTFOLIO_CREATE", createMessageRepository())(
    { permissions: ["PORTFOLIO_CREATE"], query: {} } as unknown as Request,
    response,
    next,
  );

  expect(next).toHaveBeenCalledWith();
  expect(response.status).not.toHaveBeenCalled();
});

test("requireFeature responds 403 without the permission", async () => {
  const next = jest.fn();
  const response = createResponse();

  await requireFeature("PORTFOLIO_CREATE", createMessageRepository())(
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

test("service errors respond with their status on every handler", async () => {
  const { controller, service } = buildController();
  const error = new ContributionError("MSG-10", 404, "fallback");
  service.update.mockRejectedValue(error);
  service.remove.mockRejectedValue(error);
  service.list.mockRejectedValue(error);
  service.get.mockRejectedValue(error);

  const requests = [
    [controller.update, { params: { id: CONTRIBUTION_ID }, headers: {}, userId: USER_ID }],
    [controller.remove, { params: { id: CONTRIBUTION_ID }, headers: {}, userId: USER_ID }],
    [controller.list, { params: { userId: USER_ID } }],
    [controller.get, { params: { userId: USER_ID, id: CONTRIBUTION_ID } }],
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

test("query arrays fall back to the first language", async () => {
  const { controller, service, messageRepository } = buildController();
  service.get.mockRejectedValue(new ContributionError("MSG-6", 400, "fallback"));
  const response = createResponse();
  const request = {
    params: { userId: USER_ID, id: CONTRIBUTION_ID },
    query: { language: ["en", "es"] },
  };

  await call(controller.get, request as unknown as Request, response);

  expect(messageRepository.getMessage).toHaveBeenCalledWith("MSG-6", "en");
});

test("contributionRouter declares the authenticated and public routes", () => {
  const { controller, messageRepository } = buildController();
  const router = contributionRouter(
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
    "post /portfolio/contributions",
    "put /portfolio/contributions/:id",
    "delete /portfolio/contributions/:id",
    "get /users/:userId/portfolio/contributions",
    "get /users/:userId/portfolio/contributions/:id",
  ]);
});
