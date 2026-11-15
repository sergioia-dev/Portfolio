import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { AuthenticatedRequest } from "../../../../src/module/auth/controller/auth.controller";
import type MessageRepository from "../../../../src/module/auth/repository/message.repository";
import ExperienceController, {
  requireFeature,
} from "../../../../src/module/portfolio/experiences/controller/experience.controller";
import {
  experienceNotFound,
  unauthorized,
} from "../../../../src/module/portfolio/experiences/errors/experience.errors";
import { experienceRouter } from "../../../../src/module/portfolio/experiences/routes/experience.routes";
import type ExperienceService from "../../../../src/module/portfolio/experiences/service/experience.service";
import type Jwt from "../../../../src/shared/security/jwt/jwt";

const createResponse = () => {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    set: jest.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
};

const createService = () => ({
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  list: jest.fn(),
  get: jest.fn(),
});

const createMessageRepository = () => ({ getMessage: jest.fn() });

const buildController = () => {
  const service = createService();
  const messageRepository = createMessageRepository();
  const controller = new ExperienceController(
    service as unknown as ExperienceService,
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

const page = { items: [], meta: { userId: "user-id", total: 0 } };
const experience = { id: "experience-id", start_date: "2020-01-01" };

test("create responds 201 with the new id", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.create.mockResolvedValue({ id: "experience-id" });

  await call(
    controller.create,
    { userId: "user-id", body: { start_date: "2020-01-01" } },
    response,
  );

  expect(service.create).toHaveBeenCalledWith("user-id", { start_date: "2020-01-01" });
  expect(response.status).toHaveBeenCalledWith(201);
  expect(response.json).toHaveBeenCalledWith({ id: "experience-id" });
});

test("update responds 200 with the id", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.update.mockResolvedValue({ id: "experience-id" });

  await call(
    controller.update,
    { userId: "user-id", params: { id: "experience-id" }, body: {} },
    response,
  );

  expect(service.update).toHaveBeenCalledWith("user-id", "experience-id", {});
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith({ id: "experience-id" });
});

test("remove responds 204 and forwards the If-Match header", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.remove.mockResolvedValue(undefined);

  await call(
    controller.remove,
    { userId: "user-id", params: { id: "experience-id" }, headers: { "if-match": "2024-01-01" } },
    response,
  );

  expect(service.remove).toHaveBeenCalledWith("user-id", "experience-id", "2024-01-01");
  expect(response.status).toHaveBeenCalledWith(204);
  expect(response.send).toHaveBeenCalledWith();
});

test("remove treats an absent or repeated If-Match as no precondition", async () => {
  for (const headers of [{}, { "if-match": ["a", "b"] }, { "if-match": "" }]) {
    const { controller, service } = buildController();
    const response = createResponse();
    service.remove.mockResolvedValue(undefined);

    await call(controller.remove, { userId: "user-id", params: { id: "x" }, headers }, response);

    expect(service.remove).toHaveBeenCalledWith("user-id", "x", null);
  }
});

test("list responds 200 with a public cache header", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.list.mockResolvedValue(page);

  await call(
    controller.list,
    { params: { userId: "user-id" }, query: { language: "en" } },
    response,
  );

  expect(service.list).toHaveBeenCalledWith("user-id", { language: "en" });
  expect(response.set).toHaveBeenCalledWith("Cache-Control", "public, max-age=60");
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith(page);
});

test("get responds 200 with a public cache header", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.get.mockResolvedValue(experience);

  await call(
    controller.get,
    { params: { userId: "user-id", id: "experience-id" }, query: { language: "en" } },
    response,
  );

  expect(service.get).toHaveBeenCalledWith("user-id", "experience-id", { language: "en" });
  expect(response.set).toHaveBeenCalledWith("Cache-Control", "public, max-age=60");
  expect(response.json).toHaveBeenCalledWith(experience);
});

test("handlers reject a request without an authenticated user", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  createMessageRepository().getMessage.mockResolvedValue("Unauthorized");

  await call(controller.create, { body: {}, query: {} }, response);

  expect(service.create).not.toHaveBeenCalled();
  expect(response.status).toHaveBeenCalledWith(401);
  expect(response.json).toHaveBeenCalledWith({ code: "UNAUTHORIZED", message: "Unauthorized" });
});

test("handlers localize domain errors", async () => {
  const { controller, service, messageRepository } = buildController();
  const response = createResponse();
  service.get.mockRejectedValue(experienceNotFound());
  messageRepository.getMessage.mockResolvedValue("Experiencia no encontrada.");

  await call(controller.get, { query: { language: "es" }, params: {} }, response);

  expect(messageRepository.getMessage).toHaveBeenCalledWith("MSG-10", "es");
  expect(response.status).toHaveBeenCalledWith(404);
  expect(response.json).toHaveBeenCalledWith({
    code: "MSG-10",
    message: "Experiencia no encontrada.",
  });
});

test("readLanguage uses the first repeated value and ignores non-strings", async () => {
  const messageRepository = createMessageRepository();
  messageRepository.getMessage.mockResolvedValue("Not found");
  const { service } = buildController();
  const response = createResponse();
  const controller = new ExperienceController(
    service as unknown as ExperienceService,
    messageRepository as unknown as MessageRepository,
  );
  service.get.mockRejectedValue(experienceNotFound());

  for (const query of [{ language: ["es", "en"] }, { language: 5 }, {}]) {
    await call(controller.get, { query, params: {} }, response);
  }

  expect(messageRepository.getMessage.mock.calls).toEqual([
    ["MSG-10", "es"],
    ["MSG-10", undefined],
    ["MSG-10", undefined],
  ]);
});

test("update and remove report their errors", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.remove.mockRejectedValue(experienceNotFound());

  await call(controller.update, { body: {}, params: {}, query: {} }, response);
  await call(
    controller.remove,
    { userId: "user-id", params: { id: "x" }, query: {}, headers: {} },
    response,
  );

  expect(response.status.mock.calls).toEqual([[401], [404]]);
});

test("handlers fall back to 500 for unknown errors", async () => {
  const { controller, service, messageRepository } = buildController();
  const response = createResponse();
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
  service.list.mockRejectedValue(new Error("boom"));

  await call(controller.list, { params: { userId: "user-id" }, query: {} }, response);

  expect(messageRepository.getMessage).not.toHaveBeenCalled();
  expect(response.status).toHaveBeenCalledWith(500);
  expect(response.json).toHaveBeenCalledWith({
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal Server Error",
  });
  consoleError.mockRestore();
});

test("requireFeature passes the request through when the permission is present", async () => {
  const messageRepository = createMessageRepository();
  const next = jest.fn();

  await requireFeature("PORTFOLIO_CREATE", messageRepository as unknown as MessageRepository)(
    { permissions: ["PORTFOLIO_CREATE"] } as unknown as Request,
    createResponse() as unknown as Response,
    next as NextFunction,
  );

  expect(next).toHaveBeenCalledWith();
});

test("requireFeature responds 403 when the permission is missing", async () => {
  const messageRepository = createMessageRepository();
  messageRepository.getMessage.mockResolvedValue("Forbidden");
  const response = createResponse();
  const next = jest.fn();

  for (const request of [{}, { permissions: ["PORTFOLIO_UPDATE"] }]) {
    await requireFeature("PORTFOLIO_CREATE", messageRepository as unknown as MessageRepository)(
      { ...request, query: {} } as unknown as Request,
      response as unknown as Response,
      next as NextFunction,
    );
  }

  expect(next).not.toHaveBeenCalled();
  expect(messageRepository.getMessage).toHaveBeenCalledWith("MSG-5", undefined);
  expect(response.status).toHaveBeenCalledWith(403);
  expect(response.json).toHaveBeenCalledWith({ code: "MSG-5", message: "Forbidden" });
});

test("the authenticated request type carries the token permissions", () => {
  const request = { userId: "user-id", permissions: ["PORTFOLIO_CREATE"] } as AuthenticatedRequest;

  expect(request.permissions).toEqual(["PORTFOLIO_CREATE"]);
  expect(unauthorized().code).toBe("UNAUTHORIZED");
});

test("the router registers the documented endpoints", () => {
  const { controller } = buildController();
  const router = experienceRouter(
    controller,
    {} as Jwt,
    createMessageRepository() as unknown as MessageRepository,
  );
  const stack = (
    router as unknown as {
      stack: { route?: { path: string; methods: Record<string, boolean> } }[];
    }
  ).stack;
  const routes = stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route?.methods ?? {})[0]} ${layer.route?.path}`);

  expect(routes).toEqual([
    "post /portfolio/experiences",
    "put /portfolio/experiences/:id",
    "delete /portfolio/experiences/:id",
    "get /users/:userId/portfolio/experiences",
    "get /users/:userId/portfolio/experiences/:id",
  ]);
});
