import type { Request, RequestHandler, Response } from "express";
import type MessageRepository from "../../../src/module/auth/repository/message.repository";
import UserController, { requireJson } from "../../../src/module/users/controller/user.controller";
import { invalidUsername } from "../../../src/module/users/errors/user.errors";
import { userRouter } from "../../../src/module/users/routes/user.routes";
import type UserService from "../../../src/module/users/service/user.service";
import type Jwt from "../../../src/shared/security/jwt/jwt";

const USER_ID = "user-id";

const profile = {
  id: USER_ID,
  username: "john",
  email: "john@example.com",
  provider: "LOCAL",
  role: "VISITOR",
  information: null,
};

const createResponse = () => {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    clearCookie: jest.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
};

const createService = () => ({
  getMe: jest.fn(),
  updateMe: jest.fn(),
  deleteMe: jest.fn(),
});

const createMessageRepository = () => ({ getMessage: jest.fn() });

const createUserLookup = () => ({ findById: jest.fn(async () => ({ isDeleted: false })) });

const buildController = () => {
  const service = createService();
  const messageRepository = createMessageRepository();
  const controller = new UserController(
    service as unknown as UserService,
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

test("get returns the authenticated profile", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.getMe.mockResolvedValue(profile);

  await call(controller.get, { userId: USER_ID }, response);

  expect(service.getMe).toHaveBeenCalledWith(USER_ID);
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith(profile);
});

test("get rejects a request without an authenticated user", async () => {
  const { controller, service } = buildController();
  const response = createResponse();

  await call(controller.get, { query: {} }, response);

  expect(service.getMe).not.toHaveBeenCalled();
  expect(response.status).toHaveBeenCalledWith(401);
  expect(response.json).toHaveBeenCalledWith({ code: "UNAUTHORIZED", message: "Unauthorized" });
});

test("update passes the body to the service and responds 200", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const body = { username: "john-doe" };
  service.updateMe.mockResolvedValue(profile);

  await call(controller.update, { userId: USER_ID, body, query: {} }, response);

  expect(service.updateMe).toHaveBeenCalledWith(USER_ID, body);
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith(profile);
});

test("update reports a domain error with its status and code", async () => {
  const { controller, service, messageRepository } = buildController();
  const response = createResponse();
  service.updateMe.mockRejectedValue(invalidUsername());
  messageRepository.getMessage.mockResolvedValue("Invalid username.");

  await call(controller.update, { userId: USER_ID, query: { language: "en" } }, response);

  expect(messageRepository.getMessage).toHaveBeenCalledWith("INVALID_USERNAME", "en");
  expect(response.status).toHaveBeenCalledWith(400);
  expect(response.json).toHaveBeenCalledWith({
    code: "INVALID_USERNAME",
    message: "Invalid username.",
  });
});

test("update falls back to the error message without a translated one", async () => {
  const { service } = buildController();
  const response = createResponse();
  service.updateMe.mockRejectedValue(invalidUsername());
  const messageRepository = createMessageRepository();

  const localController = new UserController(
    service as unknown as UserService,
    messageRepository as unknown as MessageRepository,
  );
  await call(localController.update, { userId: USER_ID, query: {} }, response);

  expect(response.json).toHaveBeenCalledWith({
    code: "INVALID_USERNAME",
    message: invalidUsername().message,
  });
});

test("update responds 500 for unexpected errors", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
  service.updateMe.mockRejectedValue(new Error("database down"));

  await call(controller.update, { userId: USER_ID, query: {} }, response);

  expect(consoleError).toHaveBeenCalled();
  expect(response.status).toHaveBeenCalledWith(500);
  expect(response.json).toHaveBeenCalledWith({
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal Server Error",
  });
  consoleError.mockRestore();
});

test("remove soft-deletes the account, clears both cookies and responds 204", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.deleteMe.mockResolvedValue(undefined);

  await call(controller.remove, { userId: USER_ID }, response);

  expect(service.deleteMe).toHaveBeenCalledWith(USER_ID);
  expect(response.clearCookie).toHaveBeenCalledWith("accessToken", { path: "/" });
  expect(response.clearCookie).toHaveBeenCalledWith("refreshToken", { path: "/" });
  expect(response.status).toHaveBeenCalledWith(204);
  expect(response.send).toHaveBeenCalledWith();
  expect(response.json).not.toHaveBeenCalled();
});

test("remove rejects a request without an authenticated user", async () => {
  const { controller, service } = buildController();
  const response = createResponse();

  await call(controller.remove, { query: {} }, response);

  expect(service.deleteMe).not.toHaveBeenCalled();
  expect(response.status).toHaveBeenCalledWith(401);
});

test("requireJson accepts an application/json content type", async () => {
  const messageRepository = createMessageRepository();
  const middleware = requireJson(messageRepository as unknown as MessageRepository);
  const next = jest.fn();

  await middleware(
    { headers: { "content-type": "application/json; charset=utf-8" } } as unknown as Request,
    createResponse() as unknown as Response,
    next,
  );

  expect(next).toHaveBeenCalled();
});

test("requireJson rejects another content type with 415", async () => {
  const messageRepository = createMessageRepository();
  const middleware = requireJson(messageRepository as unknown as MessageRepository);
  const response = createResponse();
  const next = jest.fn();

  await middleware(
    { headers: { "content-type": "text/plain" }, query: {} } as unknown as Request,
    response as unknown as Response,
    next,
  );

  expect(next).not.toHaveBeenCalled();
  expect(response.status).toHaveBeenCalledWith(415);
  expect(response.json).toHaveBeenCalledWith(
    expect.objectContaining({ code: "UNSUPPORTED_MEDIA_TYPE" }),
  );
});

test("the router declares the authenticated account routes", () => {
  const { controller } = buildController();
  const router = userRouter(
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
  ).toEqual(["get /me", "patch /me", "delete /me"]);
});
