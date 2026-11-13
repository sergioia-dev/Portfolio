import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import AuthController from "./module/auth/auth.controller";
import AuthRepository from "./module/auth/auth.repository";
import { authRouter } from "./module/auth/auth.routes";
import AuthService, { BcryptPasswordHasher } from "./module/auth/auth.service";
import MessageRepository from "./module/auth/message.repository";
import dataSource from "./shared/database/data-source";
import Jwt from "./shared/security/jwt/jwt";
import { requestLimiter, speedLimiter } from "./shared/security/rate-limiting/limiter";

const app = express();
const jwt = new Jwt();
const messageRepository = new MessageRepository(dataSource);
const authController = new AuthController(
  new AuthService(new AuthRepository(dataSource), jwt, new BcryptPasswordHasher()),
  messageRepository,
);

app.use(
  cors({
    origin: ["https://portfoliofrontend-dkvq0mq5j-k1s-projects-ff94b943.vercel.app"],
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(helmet());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(speedLimiter);
app.use(requestLimiter);
app.use("/auth", authRouter(authController, jwt, messageRepository));

export default app;
