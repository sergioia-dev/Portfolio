import type { Request, RequestHandler, Response } from "express";
import AuthController, {
  type AuthenticatedRequest,
  requireAuth,
} from "../../../src/module/auth/auth.controller";
import {
  invalidCredentials,
  unauthorized,
  usernameTaken,
} from "../../../src/module/auth/auth.errors";
import { authRouter } from "../../../src/module/auth/auth.routes";
import type AuthService from "../../../src/module/auth/auth.service";
import type MessageRepository from "../../../src/module/auth/message.repository";
import type Jwt from "../../../src/shared/security/jwt/jwt";

const createResponse = () => {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
};

const createService = () => ({
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  deleteAccount: jest.fn(),
});

const createMessageRepository = () => ({ getMessage: jest.fn() });

const buildController = () => {
  const service = createService();
  const messageRepository = createMessageRepository();
  const controller = new AuthController(
    service as unknown as AuthService,
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

const user = { id: "user-id", username: "john", email: "john@example.com", role: "VISITOR" };

test("register responds 201 with the created user", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.register.mockResolvedValue(user);

  await call(controller.register, { body: { username: "john" } }, response);

  expect(service.register).toHaveBeenCalledWith({ username: "john" });
  expect(response.status).toHaveBeenCalledWith(201);
  expect(response.json).toHaveBeenCalledWith(user);
});

test("register maps AuthError to its status and code", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.register.mockRejectedValue(usernameTaken());

  await call(controller.register, { body: {}, query: {} }, response);

  expect(response.status).toHaveBeenCalledWith(409);
  expect(response.json).toHaveBeenCalledWith({
    code: "MSG-1",
    message: "Username is already taken.",
  });
});

test("unexpected errors respond 500 with a generic code", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
  service.register.mockRejectedValue(new Error("database down"));

  try {
    await call(controller.register, { body: {}, query: {} }, response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
    });
    expect(consoleError).toHaveBeenCalled();
  } finally {
    consoleError.mockRestore();
  }
});

test("login sets both HttpOnly cookies and responds 200", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.login.mockResolvedValue({
    user,
    accessToken: "access-token",
    refreshToken: "refresh-token",
  });

  await call(controller.login, { body: { email: "john@example.com" } }, response);

  const cookieOptions = { httpOnly: true, secure: true, sameSite: "strict", path: "/" };
  expect(response.cookie).toHaveBeenCalledWith("accessToken", "access-token", cookieOptions);
  expect(response.cookie).toHaveBeenCalledWith("refreshToken", "refresh-token", cookieOptions);
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith(user);
});

test("login maps invalid credentials to 401", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.login.mockRejectedValue(invalidCredentials());

  await call(controller.login, { body: {}, query: {} }, response);

  expect(response.status).toHaveBeenCalledWith(401);
  expect(response.json).toHaveBeenCalledWith({ code: "MSG-4", message: "User not found" });
});

test("refresh reads the refresh cookie and sets a new access cookie", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.refresh.mockResolvedValue("new-access-token");

  await call(controller.refresh, { cookies: { refreshToken: "refresh-token" } }, response);

  expect(service.refresh).toHaveBeenCalledWith("refresh-token");
  expect(response.cookie).toHaveBeenCalledWith(
    "accessToken",
    "new-access-token",
    expect.objectContaining({ httpOnly: true, secure: true, sameSite: "strict", path: "/" }),
  );
  expect(response.status).toHaveBeenCalledWith(200);
});

test("refresh passes null when the refresh cookie is missing", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.refresh.mockRejectedValue(unauthorized());

  await call(controller.refresh, {}, response);

  expect(service.refresh).toHaveBeenCalledWith(null);
  expect(response.status).toHaveBeenCalledWith(401);
});

test("logout clears both cookies and responds 200", () => {
  const { controller } = buildController();
  const response = createResponse();

  controller.logout({} as Request, response as unknown as Response, jest.fn());

  expect(response.clearCookie).toHaveBeenCalledWith("accessToken", { path: "/" });
  expect(response.clearCookie).toHaveBeenCalledWith("refreshToken", { path: "/" });
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith({ success: true });
});

test("deleteAccount soft-deletes the authenticated user", async () => {
  const { controller, service } = buildController();
  const response = createResponse();

  await call(controller.deleteAccount, { userId: "user-id" }, response);

  expect(service.deleteAccount).toHaveBeenCalledWith("user-id");
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith({ success: true });
});

test("deleteAccount rejects a request without an authenticated user", async () => {
  const { controller, service } = buildController();
  const response = createResponse();

  await call(controller.deleteAccount, { query: {} }, response);

  expect(service.deleteAccount).not.toHaveBeenCalled();
  expect(response.status).toHaveBeenCalledWith(401);
});

test("requireAuth attaches the user id from a valid access cookie", () => {
  const jwt = { verifyAccessToken: jest.fn(() => ({ sub: "user-id" })) };
  const request = {
    query: {},
    cookies: { accessToken: "access-token" },
  } as unknown as AuthenticatedRequest;
  const response = createResponse();
  const next = jest.fn();

  requireAuth(jwt as unknown as Jwt, createMessageRepository() as unknown as MessageRepository)(
    request,
    response as unknown as Response,
    next,
  );

  expect(jwt.verifyAccessToken).toHaveBeenCalledWith("access-token");
  expect(request.userId).toBe("user-id");
  expect(next).toHaveBeenCalled();
  expect(response.json).not.toHaveBeenCalled();
});

test("requireAuth rejects a missing or invalid access cookie", async () => {
  const jwt = { verifyAccessToken: jest.fn(() => ({ sub: "user-id" })) };
  const middleware = requireAuth(
    jwt as unknown as Jwt,
    createMessageRepository() as unknown as MessageRepository,
  );

  const missingResponse = createResponse();
  const missingNext = jest.fn();
  await middleware(
    { query: {} } as unknown as Request,
    missingResponse as unknown as Response,
    missingNext,
  );
  expect(missingNext).not.toHaveBeenCalled();
  expect(missingResponse.status).toHaveBeenCalledWith(401);
  expect(missingResponse.json).toHaveBeenCalledWith({
    code: "UNAUTHORIZED",
    message: "Unauthorized",
  });

  jwt.verifyAccessToken.mockImplementation(() => {
    throw new Error("expired");
  });
  const invalidResponse = createResponse();
  const invalidNext = jest.fn();
  await middleware(
    { query: {}, cookies: { accessToken: "expired" } } as unknown as Request,
    invalidResponse as unknown as Response,
    invalidNext,
  );
  expect(invalidNext).not.toHaveBeenCalled();
  expect(invalidResponse.status).toHaveBeenCalledWith(401);
});

test("authRouter registers every auth route", () => {
  const { controller } = buildController();
  const router = authRouter(
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
    "post /register",
    "post /login",
    "post /refresh",
    "post /logout",
    "delete /account",
  ]);
});

test("register localizes the error message with the language query param", async () => {
  const { controller, service, messageRepository } = buildController();
  const response = createResponse();
  service.register.mockRejectedValue(usernameTaken());
  messageRepository.getMessage.mockResolvedValue("El nombre de usuario ya está en uso.");

  await call(controller.register, { body: {}, query: { language: "es" } }, response);

  expect(messageRepository.getMessage).toHaveBeenCalledWith("MSG-1", "es");
  expect(response.status).toHaveBeenCalledWith(409);
  expect(response.json).toHaveBeenCalledWith({
    code: "MSG-1",
    message: "El nombre de usuario ya está en uso.",
  });
});

test("register uses the first value when the language param is repeated", async () => {
  const { controller, service, messageRepository } = buildController();
  const response = createResponse();
  service.register.mockRejectedValue(usernameTaken());
  messageRepository.getMessage.mockResolvedValue("El nombre de usuario ya está en uso.");

  await call(controller.register, { body: {}, query: { language: ["es", "en"] } }, response);

  expect(messageRepository.getMessage).toHaveBeenCalledWith("MSG-1", "es");
});

test("register ignores a non-string language param", async () => {
  const { controller, service, messageRepository } = buildController();
  const response = createResponse();
  service.register.mockRejectedValue(usernameTaken());

  await call(controller.register, { body: {}, query: { language: {} } }, response);

  expect(messageRepository.getMessage).toHaveBeenCalledWith("MSG-1", undefined);
  expect(response.json).toHaveBeenCalledWith({
    code: "MSG-1",
    message: "Username is already taken.",
  });
});

test("refresh reports errors in the default language", async () => {
  const { controller, service, messageRepository } = buildController();
  const response = createResponse();
  service.refresh.mockRejectedValue(unauthorized());

  await call(controller.refresh, { query: { language: "es" } }, response);

  expect(messageRepository.getMessage).toHaveBeenCalledWith("UNAUTHORIZED", undefined);
  expect(response.json).toHaveBeenCalledWith({
    code: "UNAUTHORIZED",
    message: "Unauthorized",
  });
});

test("requireAuth localizes the unauthorized message", async () => {
  const jwt = { verifyAccessToken: jest.fn() };
  const messageRepository = createMessageRepository();
  messageRepository.getMessage.mockResolvedValue("No autorizado");
  const response = createResponse();

  await requireAuth(jwt as unknown as Jwt, messageRepository as unknown as MessageRepository)(
    { query: { language: "es" } } as unknown as Request,
    response as unknown as Response,
    jest.fn(),
  );

  expect(messageRepository.getMessage).toHaveBeenCalledWith("UNAUTHORIZED", "es");
  expect(response.status).toHaveBeenCalledWith(401);
  expect(response.json).toHaveBeenCalledWith({
    code: "UNAUTHORIZED",
    message: "No autorizado",
  });
});
