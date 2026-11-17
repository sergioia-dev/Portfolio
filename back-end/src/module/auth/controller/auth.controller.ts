import type { CookieOptions, Request, RequestHandler, Response } from "express";
import type Jwt from "../../../shared/security/jwt/jwt";
import { AuthError, unauthorized } from "../errors/auth.errors";
import type MessageRepository from "../repository/message.repository";
import type AuthService from "../service/auth.service";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  permissions?: string[];
}

export interface UserLookup {
  findById(id: string): Promise<{ isDeleted: boolean } | null>;
}

type SendError = (
  error: unknown,
  language: string | undefined,
  response: Response,
) => Promise<void>;

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/",
};

const readCookie = (request: Request, name: string): string | null =>
  ((request.cookies as Record<string, string> | undefined)?.[name] as string | undefined) ?? null;

const readLanguage = (request: Request): string | undefined => {
  const language = request.query.language;
  if (Array.isArray(language)) return typeof language[0] === "string" ? language[0] : undefined;
  return typeof language === "string" ? language : undefined;
};

const createSendError =
  (messageRepository: MessageRepository): SendError =>
  async (error, language, response) => {
    if (error instanceof AuthError) {
      const message = (await messageRepository.getMessage(error.code, language)) ?? error.message;
      response.status(error.httpStatus).json({ code: error.code, message });
      return;
    }
    console.error("!!! Error auth controller :\n", error);
    response.status(500).json({ code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" });
  };

export const requireAuth = (
  jwt: Jwt,
  messageRepository: MessageRepository,
  userLookup: UserLookup,
): RequestHandler => {
  const sendError = createSendError(messageRepository);
  return async (request, response, next) => {
    const language = readLanguage(request);
    const token = readCookie(request, "accessToken");
    if (!token) {
      await sendError(unauthorized(), language, response);
      return;
    }

    let payload: ReturnType<Jwt["verifyAccessToken"]>;
    try {
      payload = jwt.verifyAccessToken(token);
    } catch {
      await sendError(unauthorized(), language, response);
      return;
    }

    const user = await userLookup.findById(payload.sub);
    if (!user || user.isDeleted) {
      await sendError(unauthorized(), language, response);
      return;
    }

    (request as AuthenticatedRequest).userId = payload.sub;
    (request as AuthenticatedRequest).permissions = payload.permissions;
    next();
  };
};

export default class AuthController {
  private readonly sendError: SendError;

  constructor(
    private readonly service: AuthService,
    messageRepository: MessageRepository,
  ) {
    this.sendError = createSendError(messageRepository);
  }

  register: RequestHandler = async (request, response) => {
    try {
      response.status(201).json(await this.service.register(request.body));
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  login: RequestHandler = async (request, response) => {
    try {
      const { user, accessToken, refreshToken } = await this.service.login(request.body);
      response.cookie("accessToken", accessToken, COOKIE_OPTIONS);
      response.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);
      response.status(200).json(user);
    } catch (error) {
      await this.sendError(error, readLanguage(request), response);
    }
  };

  refresh: RequestHandler = async (request, response) => {
    try {
      const accessToken = await this.service.refresh(readCookie(request, "refreshToken"));
      response.cookie("accessToken", accessToken, COOKIE_OPTIONS);
      response.status(200).json({ success: true });
    } catch (error) {
      await this.sendError(error, undefined, response);
    }
  };

  logout: RequestHandler = (_request, response) => {
    response.clearCookie("accessToken", { path: "/" });
    response.clearCookie("refreshToken", { path: "/" });
    response.status(200).json({ success: true });
  };
}
