import type { Request, RequestHandler, Response } from "express";
import AdministrationController, {
  requireFeature,
  serializeUser,
} from "../../../src/module/administration/controller/administration.controller";
import {
  invalidField,
  userNotFound,
} from "../../../src/module/administration/errors/administration.errors";
import { administrationRouter } from "../../../src/module/administration/routes/administration.routes";
import type AdministrationService from "../../../src/module/administration/service/administration.service";
import type MessageRepository from "../../../src/module/auth/repository/message.repository";
import type Jwt from "../../../src/shared/security/jwt/jwt";

const USER_ID = "2f1c9f2e-0c3b-4a1e-9a1e-3b1e3a1e3a1e";

const user = (overrides: Record<string, unknown> = {}) => ({
  id: USER_ID,
  username: "sergio-dev",
  email: "sergio@example.com",
  isDeleted: false,
  deletedAt: null,
  provider: { name: "LOCAL" },
  rol: { name: "VISITOR", functionalities: [] },
  information: {
    fullName: "Sergio Dev",
    phone: "+57 300 000 0000",
    country: "Colombia",
    githubUrl: "https://github.com/sergio",
    gitlabUrl: null,
    linkedinUrl: "https://linkedin.com/in/sergio",
    businessEmail: "sergio@business.com",
  },
  ...overrides,
});

const createResponse = () => {
  const response = { status: jest.fn(), json: jest.fn(), send: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
};

const createService = () => ({
  search: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
});

const createMessageRepository = () => ({ getMessage: jest.fn() });

const createUserLookup = () => ({ findById: jest.fn(async () => ({ isDeleted: false })) });

const buildController = () => {
  const service = createService();
  const messageRepository = createMessageRepository();
  const controller = new AdministrationController(
    service as unknown as AdministrationService,
    messageRepository as unknown as MessageRepository,
  );
  return { controller, service, messageRepository };
};

const call = async (
  handler: RequestHandler,
  request: Record<string, unknown>,
  response: ReturnType<typeof createResponse>,
) => {
  await handler(request as unknown as Request, response as unknown as Response, jest.fn());
};

test("serializeUser exposes the summary with snake_case information", () => {
  expect(serializeUser(user() as never)).toEqual({
    id: USER_ID,
    username: "sergio-dev",
    email: "sergio@example.com",
    provider: "LOCAL",
    role: "VISITOR",
    is_administrator: false,
    is_deleted: false,
    deleted_at: null,
    information: {
      full_name: "Sergio Dev",
      phone: "+57 300 000 0000",
      country: "Colombia",
      github_url: "https://github.com/sergio",
      gitlab_url: null,
      linkedin_url: "https://linkedin.com/in/sergio",
      business_email: "sergio@business.com",
    },
  });
});

test("serializeUser reports administrators and missing information", () => {
  const serialized = serializeUser(
    user({
      isDeleted: true,
      deletedAt: "2026-01-01T00:00:00.000Z",
      information: null,
      rol: { name: "ADMIN", functionalities: [{ name: "ADMINISTRATOR" }] },
    }) as never,
  );

  expect(serialized).toMatchObject({
    role: "ADMIN",
    is_administrator: true,
    is_deleted: true,
    deleted_at: "2026-01-01T00:00:00.000Z",
    information: null,
  });
});

test("search responds with the items and pagination metadata", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.search.mockResolvedValue({
    items: [user()],
    query: "sergio",
    page: 1,
    limit: 20,
    total: 21,
  });

  await call(controller.search, { userId: USER_ID, query: { query: "sergio" } }, response);

  expect(service.search).toHaveBeenCalledWith({ query: "sergio" });
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith({
    items: [serializeUser(user() as never)],
    meta: { query: "sergio", page: 1, limit: 20, total: 21, total_pages: 2 },
  });
});

test("search rejects a request without an authenticated user", async () => {
  const { controller, service } = buildController();
  const response = createResponse();

  await call(controller.search, { query: {} }, response);

  expect(service.search).not.toHaveBeenCalled();
  expect(response.status).toHaveBeenCalledWith(401);
  expect(response.json).toHaveBeenCalledWith({ code: "UNAUTHORIZED", message: "Unauthorized" });
});

test("update responds with the refreshed summary", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const body = { username: "updated-name" };
  service.update.mockResolvedValue(user({ username: "updated-name" }));

  await call(
    controller.update,
    { userId: USER_ID, params: { userId: USER_ID }, body, query: {} },
    response,
  );

  expect(service.update).toHaveBeenCalledWith(USER_ID, body);
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith(
    expect.objectContaining({ id: USER_ID, username: "updated-name" }),
  );
});

test("update translates a domain error with the requested language", async () => {
  const { controller, service, messageRepository } = buildController();
  const response = createResponse();
  service.update.mockRejectedValue(invalidField("username"));
  messageRepository.getMessage.mockResolvedValue("Invalid field.");

  await call(
    controller.update,
    { userId: USER_ID, params: { userId: USER_ID }, body: {}, query: { language: "en" } },
    response,
  );

  expect(messageRepository.getMessage).toHaveBeenCalledWith("INVALID_FIELD", "en");
  expect(response.status).toHaveBeenCalledWith(400);
  expect(response.json).toHaveBeenCalledWith({ code: "INVALID_FIELD", message: "Invalid field." });
});

test("update falls back to the error message without a translation", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const error = userNotFound();
  service.update.mockRejectedValue(error);

  await call(
    controller.update,
    { userId: USER_ID, params: { userId: USER_ID }, query: {} },
    response,
  );

  expect(response.status).toHaveBeenCalledWith(404);
  expect(response.json).toHaveBeenCalledWith({ code: "MSG-4", message: error.message });
});

test("update responds 500 for unexpected errors", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
  service.update.mockRejectedValue(new Error("database down"));

  await call(
    controller.update,
    { userId: USER_ID, params: { userId: USER_ID }, query: {} },
    response,
  );

  expect(consoleError).toHaveBeenCalled();
  expect(response.status).toHaveBeenCalledWith(500);
  expect(response.json).toHaveBeenCalledWith({
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal Server Error",
  });
  consoleError.mockRestore();
});

test("remove soft-deletes the target and responds 204 without a body", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.softDelete.mockResolvedValue(undefined);

  await call(controller.remove, { userId: USER_ID, params: { userId: USER_ID } }, response);

  expect(service.softDelete).toHaveBeenCalledWith(USER_ID);
  expect(response.status).toHaveBeenCalledWith(204);
  expect(response.send).toHaveBeenCalledWith();
  expect(response.json).not.toHaveBeenCalled();
});

test("remove rejects a request without an authenticated user", async () => {
  const { controller, service } = buildController();
  const response = createResponse();

  await call(controller.remove, { params: { userId: USER_ID }, query: {} }, response);

  expect(service.softDelete).not.toHaveBeenCalled();
  expect(response.status).toHaveBeenCalledWith(401);
});

test("requireFeature lets an administrator through", async () => {
  const messageRepository = createMessageRepository();
  const middleware = requireFeature(
    "ADMINISTRATOR",
    messageRepository as unknown as MessageRepository,
  );
  const next = jest.fn();

  await middleware(
    { userId: USER_ID, permissions: ["ADMINISTRATOR"], query: {} } as unknown as Request,
    createResponse() as unknown as Response,
    next,
  );

  expect(next).toHaveBeenCalled();
  expect(messageRepository.getMessage).not.toHaveBeenCalled();
});

test("requireFeature rejects a caller without the feature", async () => {
  const messageRepository = createMessageRepository();
  messageRepository.getMessage.mockResolvedValue("Forbidden.");
  const middleware = requireFeature(
    "ADMINISTRATOR",
    messageRepository as unknown as MessageRepository,
  );
  const response = createResponse();
  const next = jest.fn();

  await middleware(
    {
      userId: USER_ID,
      permissions: ["PORTFOLIO_CREATE"],
      query: { language: "en" },
    } as unknown as Request,
    response as unknown as Response,
    next,
  );

  expect(next).not.toHaveBeenCalled();
  expect(messageRepository.getMessage).toHaveBeenCalledWith("MSG-5", "en");
  expect(response.status).toHaveBeenCalledWith(403);
  expect(response.json).toHaveBeenCalledWith({ code: "MSG-5", message: "Forbidden." });
});

test("requireFeature rejects an unauthenticated caller", async () => {
  const messageRepository = createMessageRepository();
  const middleware = requireFeature(
    "ADMINISTRATOR",
    messageRepository as unknown as MessageRepository,
  );
  const response = createResponse();
  const next = jest.fn();

  await middleware({ query: {} } as unknown as Request, response as unknown as Response, next);

  expect(next).not.toHaveBeenCalled();
  expect(response.status).toHaveBeenCalledWith(401);
  expect(response.json).toHaveBeenCalledWith({ code: "UNAUTHORIZED", message: "Unauthorized" });
});

test("the router declares the administration routes", () => {
  const { controller } = buildController();
  const router = administrationRouter(
    controller,
    {} as Jwt,
    createMessageRepository() as unknown as MessageRepository,
    createUserLookup(),
  );
  const stack = (
    router as unknown as {
      stack: { route?: { path: string; methods: Record<string, boolean> } }[];
    }
  ).stack;

  expect(
    stack
      .filter((layer) => layer.route)
      .map((layer) => `${Object.keys(layer.route?.methods ?? {})[0]} ${layer.route?.path}`),
  ).toEqual(["get /", "patch /:userId", "delete /:userId"]);
});
