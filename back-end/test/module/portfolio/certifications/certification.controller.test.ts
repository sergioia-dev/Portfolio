import { PassThrough } from "node:stream";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { AuthenticatedRequest } from "../../../../src/module/auth/controller/auth.controller";
import type MessageRepository from "../../../../src/module/auth/repository/message.repository";
import CertificationController, {
  requireFeature,
} from "../../../../src/module/portfolio/certifications/controller/certification.controller";
import {
  certificationNotFound,
  unauthorized,
} from "../../../../src/module/portfolio/certifications/errors/certification.errors";
import { certificationRouter } from "../../../../src/module/portfolio/certifications/routes/certification.routes";
import type CertificationService from "../../../../src/module/portfolio/certifications/service/certification.service";
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
  const controller = new CertificationController(
    service as unknown as CertificationService,
    messageRepository as unknown as MessageRepository,
  );
  return { controller, service, messageRepository };
};

const call = async (
  handler: RequestHandler,
  request: Record<string, unknown>,
  response: ReturnType<typeof createResponse>,
) =>
  handler(
    request as unknown as Request,
    response as unknown as Response,
    jest.fn() as NextFunction,
  );

const certification = {
  id: "certification-id",
  userId: "user-id",
  title: "React",
  description: "Advanced",
  documentUrl: "https://storage.googleapis.com/bucket/document.pdf",
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

const multipartBody = (
  parts: Array<{ name: string; value: string }>,
  file?: Buffer,
  field = "document",
) => {
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
        `------portfolio\r\nContent-Disposition: form-data; name="${field}"; filename="document.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
      ),
    );
    chunks.push(file);
    chunks.push(Buffer.from("\r\n"));
  }
  chunks.push(Buffer.from("------portfolio--\r\n"));
  return Buffer.concat(chunks);
};

test("create responds 201 with the serialized certification", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.create.mockResolvedValue(certification);

  await call(
    controller.create,
    { userId: "user-id", body: { title: "React", description: "Advanced" }, query: {} },
    response,
  );

  expect(service.create).toHaveBeenCalledWith(
    "user-id",
    { title: "React", description: "Advanced" },
    undefined,
  );
  expect(response.status).toHaveBeenCalledWith(201);
  expect(response.json).toHaveBeenCalledWith({
    id: "certification-id",
    title: "React",
    description: "Advanced",
    document_url: "https://storage.googleapis.com/bucket/document.pdf",
  });
});

test("create requires authentication", async () => {
  const { controller } = buildController();
  const response = createResponse();

  await call(controller.create, { body: {}, query: {} }, response);

  expect(response.status).toHaveBeenCalledWith(401);
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ code: "UNAUTHORIZED" }));
});

test("create forwards the parsed document", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  const document = Buffer.from("%PDF-1.7");
  service.create.mockResolvedValue(certification);

  await call(
    controller.create,
    {
      userId: "user-id",
      body: { title: "React", description: "Advanced" },
      files: { document: [{ buffer: document }] },
      query: {},
    },
    response,
  );

  expect(service.create).toHaveBeenCalledWith(
    "user-id",
    { title: "React", description: "Advanced" },
    document,
  );
});

test("update responds 200 with the certification payload", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.update.mockResolvedValue({ ...certification, title: "React Advanced" });

  await call(
    controller.update,
    {
      userId: "user-id",
      params: { certificationId: "certification-id" },
      body: { title: "React Advanced" },
      query: {},
    },
    response,
  );

  expect(service.update).toHaveBeenCalledWith(
    "user-id",
    "certification-id",
    {
      title: "React Advanced",
    },
    undefined,
  );
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ title: "React Advanced" }));
});

test("remove responds 204", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.remove.mockResolvedValue(undefined);

  await call(
    controller.remove,
    { userId: "user-id", params: { certificationId: "certification-id" }, query: {} },
    response,
  );

  expect(service.remove).toHaveBeenCalledWith("user-id", "certification-id");
  expect(response.status).toHaveBeenCalledWith(204);
  expect(response.send).toHaveBeenCalled();
});

test("list responds with a serialized page", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.list.mockResolvedValue({
    items: [certification],
    page: 2,
    limit: 20,
    total: 1,
  });

  await call(controller.list, { params: { userId: "user-id" }, query: { page: "2" } }, response);

  expect(service.list).toHaveBeenCalledWith("user-id", { page: "2" });
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.set).not.toHaveBeenCalled();
  expect(response.json).toHaveBeenCalledWith({
    items: [
      {
        id: "certification-id",
        title: "React",
        description: "Advanced",
        document_url: "https://storage.googleapis.com/bucket/document.pdf",
      },
    ],
    page: 2,
    limit: 20,
    total: 1,
  });
});

test("get responds with the serialized certification", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.get.mockResolvedValue(certification);

  await call(
    controller.get,
    { params: { userId: "user-id", certificationId: "certification-id" }, query: {} },
    response,
  );

  expect(service.get).toHaveBeenCalledWith("user-id", "certification-id");
  expect(response.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ id: "certification-id" }));
});

test("update and remove report domain errors", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.update.mockRejectedValue(certificationNotFound());
  const updateResponse = createResponse();

  await call(
    controller.update,
    { userId: "user-id", params: { certificationId: "certification-id" }, body: {}, query: {} },
    updateResponse,
  );
  expect(updateResponse.status).toHaveBeenCalledWith(404);

  service.remove.mockRejectedValue(certificationNotFound());
  await call(
    controller.remove,
    { userId: "user-id", params: { certificationId: "certification-id" }, query: {} },
    response,
  );
  expect(response.status).toHaveBeenCalledWith(404);
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ code: "MSG-10" }));
});

test("create reads an array language and ignores a non-object files value", async () => {
  const { controller, service, messageRepository } = buildController();
  const response = createResponse();
  service.create.mockRejectedValue(certificationNotFound());
  messageRepository.getMessage.mockResolvedValue("Experience not found.");

  await call(
    controller.create,
    { userId: "user-id", body: {}, files: [], query: { language: ["es"] } },
    response,
  );

  expect(messageRepository.getMessage).toHaveBeenCalledWith("MSG-10", "es");
  expect(response.status).toHaveBeenCalledWith(404);

  const otherResponse = createResponse();
  await call(
    controller.create,
    { userId: "user-id", body: {}, query: { language: [1] } },
    otherResponse,
  );
  expect(messageRepository.getMessage).toHaveBeenCalledWith("MSG-10", undefined);
});

test("a domain error is translated through the message repository", async () => {
  const { controller, service, messageRepository } = buildController();
  const response = createResponse();
  service.get.mockRejectedValue(certificationNotFound());
  messageRepository.getMessage.mockResolvedValue("Experience not found.");

  await call(
    controller.get,
    { params: { userId: "user-id", certificationId: "certification-id" }, query: {} },
    response,
  );

  expect(messageRepository.getMessage).toHaveBeenCalledWith("MSG-10", undefined);
  expect(response.status).toHaveBeenCalledWith(404);
  expect(response.json).toHaveBeenCalledWith({ code: "MSG-10", message: "Experience not found." });
});

test("an unexpected error responds 500", async () => {
  const { controller, service } = buildController();
  const response = createResponse();
  service.list.mockRejectedValue(new Error("boom"));
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

  await call(controller.list, { params: { userId: "user-id" }, query: {} }, response);

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

test("parseMultipart reads the text parts and the document", async () => {
  const { controller } = buildController();
  const response = createResponse();
  const next = jest.fn();
  const document = Buffer.from("%PDF-1.7\nbody");
  const request = multipartRequest(
    multipartBody(
      [
        { name: "title", value: "React" },
        { name: "description", value: "Advanced" },
      ],
      document,
    ),
  );

  await controller.parseMultipart(
    request as unknown as Request,
    response as unknown as Response,
    next,
  );

  await new Promise((resolve) => setTimeout(resolve, 20));

  expect(next).toHaveBeenCalledWith();
  expect((request as unknown as { body: { title: string } }).body.title).toBe("React");
  expect(
    (request as unknown as { files: { document: Array<{ buffer: Buffer }> } }).files.document[0]
      .buffer,
  ).toEqual(document);
});

test("parseMultipart rejects an unexpected file part with INVALID_FORMAT", async () => {
  const { controller } = buildController();
  const response = createResponse();
  const next = jest.fn();
  const request = multipartRequest(multipartBody([], Buffer.from("%PDF-1.7"), "unexpected"));

  await controller.parseMultipart(
    request as unknown as Request,
    response as unknown as Response,
    next,
  );

  await new Promise((resolve) => setTimeout(resolve, 20));

  expect(response.status).toHaveBeenCalledWith(400);
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ code: "INVALID_FORMAT" }));
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

test("the router wires the certification endpoints", () => {
  const { controller } = buildController();
  const router = certificationRouter(
    controller,
    {} as Jwt,
    createMessageRepository() as unknown as MessageRepository,
  );

  expect(router.stack).toHaveLength(5);
  expect(unauthorized).toBeDefined();
  expect((controller as unknown as AuthenticatedRequest).userId).toBeUndefined();
});
