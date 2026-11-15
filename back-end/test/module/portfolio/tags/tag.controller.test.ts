import { PassThrough } from "node:stream";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { AuthenticatedRequest } from "../../../../src/module/auth/controller/auth.controller";
import type MessageRepository from "../../../../src/module/auth/repository/message.repository";
import TagController, {
  requireFeature,
} from "../../../../src/module/portfolio/tags/controller/tag.controller";
import { tagNotFound, unauthorized } from "../../../../src/module/portfolio/tags/errors/tag.errors";
import { tagRouter } from "../../../../src/module/portfolio/tags/routes/tag.routes";
import type TagService from "../../../../src/module/portfolio/tags/service/tag.service";
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
  const controller = new TagController(
    service as unknown as TagService,
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

const tag = {
  id: "tag-id",
  name: "React",
  filterable: true,
  imageUrl: "https://storage.googleapis.com/bucket/tags/id",
};

const multipartRequest = (content: Buffer) => {
  const request = new PassThrough() as PassThrough & Record<string, unknown>;
  request.headers = {
    "content-type": "multipart/form-data; boundary=----portfolio",
    "content-length": String(content.length),
  };
  request.query = {};
  request.is = () => "multipart/form-data";
  request.push(content);
  request.push(null);
  return request;
};

const multipartBody = (parts: Array<{ name: string; value: string }>, file?: Buffer) => {
  const chunks: Buffer[] = [];
  for (const part of parts) {
    chunks.push(
      Buffer.from(
        `------portfolio\r\nContent-Disposition: form-data; name="${part.name}"\r\n\r\n${part.value}\r\n`,
      ),
    );
  }
  if (file) {
    chunks.push(
      Buffer.from(
        '------portfolio\r\nContent-Disposition: form-data; name="image"; filename="tag.svg"\r\nContent-Type: image/svg+xml\r\n\r\n',
      ),
    );
    chunks.push(file);
    chunks.push(Buffer.from("\r\n"));
  }
  chunks.push(Buffer.from("------portfolio--\r\n"));
  return Buffer.concat(chunks);
};

test("create responds 201 with the serialized tag", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.create.mockResolvedValue(tag);

  await call(
    controller.create,
    { userId: "user-id", body: { name: "React" }, query: {} },
    response,
  );

  expect(service.create).toHaveBeenCalledWith("user-id", { name: "React" }, undefined);
  expect(response.status).toHaveBeenCalledWith(201);
  expect(response.json).toHaveBeenCalledWith({
    id: "tag-id",
    name: "React",
    filterable: true,
    image_url: "https://storage.googleapis.com/bucket/tags/id",
  });
});

test("create requires authentication", async () => {
  const { controller } = buildController();
  const response = createResponse();

  await call(controller.create, { body: {}, query: {} }, response);

  expect(response.status).toHaveBeenCalledWith(401);
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ code: "UNAUTHORIZED" }));
});

test("update responds 200 and forwards If-Match, body and file", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.update.mockResolvedValue(tag);
  const file = { buffer: Buffer.from("<svg></svg>") };

  await call(
    controller.update,
    {
      userId: "user-id",
      params: { id: "tag-id" },
      headers: { "if-match": "2024-01-01" },
      body: { name: "React", filterable: "true" },
      file,
      query: {},
    },
    response,
  );

  expect(service.update).toHaveBeenCalledWith(
    "user-id",
    "tag-id",
    "2024-01-01",
    { name: "React", filterable: "true" },
    file,
  );
  expect(response.status).toHaveBeenCalledWith(200);
});

test("update treats absent or repeated If-Match as no precondition", async () => {
  for (const headers of [{}, { "if-match": ["a", "b"] }, { "if-match": "" }]) {
    const { controller, service } = buildController();
    const response = createResponse();
    service.update.mockResolvedValue(tag);

    await call(
      controller.update,
      { userId: "user-id", params: { id: "tag-id" }, headers, body: {}, query: {} },
      response,
    );

    expect(service.update).toHaveBeenCalledWith("user-id", "tag-id", null, {}, undefined);
  }
});

test("remove responds 204", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.remove.mockResolvedValue(undefined);

  await call(
    controller.remove,
    { userId: "user-id", params: { id: "tag-id" }, query: {} },
    response,
  );

  expect(service.remove).toHaveBeenCalledWith("user-id", "tag-id");
  expect(response.status).toHaveBeenCalledWith(204);
  expect(response.send).toHaveBeenCalledWith();
});

test("list responds 200 with items, meta and a public cache header", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.list.mockResolvedValue({ items: [tag], total: 3, filterable: null, limit: 2, page: 2 });

  await call(
    controller.list,
    { params: { userId: "user-id" }, query: { page: "2" }, headers: {} },
    response,
  );

  expect(response.set).toHaveBeenCalledWith("Cache-Control", "public, max-age=60");
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith({
    items: [
      {
        id: "tag-id",
        name: "React",
        filterable: true,
        image_url: "https://storage.googleapis.com/bucket/tags/id",
      },
    ],
    meta: { filterable: null, page: 2, limit: 2, total: 3, total_pages: 2 },
  });
});

test("get responds 200 with the tag and a public cache header", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.get.mockResolvedValue(tag);

  await call(
    controller.get,
    { params: { userId: "user-id", id: "tag-id" }, query: {}, headers: {} },
    response,
  );

  expect(service.get).toHaveBeenCalledWith("user-id", "tag-id");
  expect(response.set).toHaveBeenCalledWith("Cache-Control", "public, max-age=60");
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ id: "tag-id" }));
});

test("domain errors are answered with the translated message", async () => {
  const { controller, service, messageRepository } = buildController();
  const response = createResponse();
  service.get.mockRejectedValue(tagNotFound());
  messageRepository.getMessage.mockResolvedValue("Etiqueta no encontrada.");

  await call(
    controller.get,
    { params: { userId: "user-id", id: "tag-id" }, query: { language: "es" }, headers: {} },
    response,
  );

  expect(messageRepository.getMessage).toHaveBeenCalledWith("MSG-14", "es");
  expect(response.status).toHaveBeenCalledWith(404);
  expect(response.json).toHaveBeenCalledWith({
    code: "MSG-14",
    message: "Etiqueta no encontrada.",
  });
});

test("unexpected errors are answered with 500", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.get.mockRejectedValue(new Error("boom"));
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

  await call(
    controller.get,
    { params: { userId: "user-id", id: "tag-id" }, query: {}, headers: {} },
    response,
  );

  expect(response.status).toHaveBeenCalledWith(500);
  expect(response.json).toHaveBeenCalledWith({
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal Server Error",
  });
  consoleError.mockRestore();
});

test("parseMultipart rejects a non-multipart request with 415", async () => {
  const { controller } = buildController();
  const response = createResponse();
  const next = jest.fn();

  await controller.parseMultipart(
    { is: () => false, query: {} } as unknown as Request,
    response as unknown as Response,
    next,
  );

  expect(response.status).toHaveBeenCalledWith(415);
  expect(response.json).toHaveBeenCalledWith(
    expect.objectContaining({ code: "UNSUPPORTED_MEDIA_TYPE" }),
  );
  expect(next).not.toHaveBeenCalled();
});

test("parseMultipart reads fields and the image", async () => {
  const { controller } = buildController();
  const response = createResponse();
  const next = jest.fn();
  const svg = Buffer.from("<svg></svg>");
  const request = multipartRequest(
    multipartBody(
      [
        { name: "name", value: "React" },
        { name: "filterable", value: "true" },
      ],
      svg,
    ),
  );

  await controller.parseMultipart(
    request as unknown as Request,
    response as unknown as Response,
    next,
  );

  await new Promise((resolve) => setTimeout(resolve, 20));

  expect(next).toHaveBeenCalledWith();
  expect((request as unknown as { body: { name: string } }).body.name).toBe("React");
  expect((request as unknown as { file: { buffer: Buffer } }).file.buffer).toEqual(svg);
});

test("parseMultipart rejects an oversized image with 415", async () => {
  const { controller } = buildController();
  const response = createResponse();
  const next = jest.fn();
  const request = multipartRequest(
    multipartBody([{ name: "name", value: "React" }], Buffer.alloc(256 * 1024 + 1, 1)),
  );

  await controller.parseMultipart(
    request as unknown as Request,
    response as unknown as Response,
    next,
  );

  await new Promise((resolve) => setTimeout(resolve, 20));

  expect(response.status).toHaveBeenCalledWith(400);
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ code: "INVALID_IMAGE" }));
  expect(next).not.toHaveBeenCalled();
});

test("requireFeature allows a permitted feature and rejects a missing one", async () => {
  const messageRepository = createMessageRepository();
  const middleware = requireFeature(
    "PORTFOLIO_CREATE",
    messageRepository as unknown as MessageRepository,
  );
  const next = jest.fn();
  const response = createResponse();

  await middleware(
    { userId: "user-id", permissions: ["PORTFOLIO_CREATE"], query: {} } as unknown as Request,
    response as unknown as Response,
    next as NextFunction,
  );
  expect(next).toHaveBeenCalled();

  await middleware(
    { userId: "user-id", permissions: [], query: {} } as unknown as Request,
    response as unknown as Response,
    next as NextFunction,
  );
  expect(response.status).toHaveBeenCalledWith(403);
});

test("requireFeature rejects an unauthenticated request with 401", async () => {
  const messageRepository = createMessageRepository();
  const middleware = requireFeature(
    "PORTFOLIO_CREATE",
    messageRepository as unknown as MessageRepository,
  );
  const response = createResponse();

  await middleware(
    { permissions: undefined, query: {} } as unknown as Request,
    response as unknown as Response,
    jest.fn() as NextFunction,
  );

  expect(response.status).toHaveBeenCalledWith(401);
});

test("the router wires the tag endpoints", () => {
  const { controller } = buildController();
  const router = tagRouter(
    controller,
    {} as Jwt,
    createMessageRepository() as unknown as MessageRepository,
  );

  expect(router.stack).toHaveLength(5);
  expect(unauthorized).toBeDefined();
  expect((controller as unknown as AuthenticatedRequest).userId).toBeUndefined();
});
