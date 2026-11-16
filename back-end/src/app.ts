import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import AuthController from "./module/auth/controller/auth.controller";
import AuthRepository from "./module/auth/repository/auth.repository";
import MessageRepository from "./module/auth/repository/message.repository";
import { authRouter } from "./module/auth/routes/auth.routes";
import AuthService, { BcryptPasswordHasher } from "./module/auth/service/auth.service";
import CertificationController from "./module/portfolio/certifications/controller/certification.controller";
import CertificationRepository from "./module/portfolio/certifications/repository/certification.repository";
import { certificationRouter } from "./module/portfolio/certifications/routes/certification.routes";
import CertificationService from "./module/portfolio/certifications/service/certification.service";
import ExperienceController from "./module/portfolio/experiences/controller/experience.controller";
import ExperienceRepository from "./module/portfolio/experiences/repository/experience.repository";
import { experienceRouter } from "./module/portfolio/experiences/routes/experience.routes";
import ExperienceService from "./module/portfolio/experiences/service/experience.service";
import TagController from "./module/portfolio/tags/controller/tag.controller";
import TagRepository from "./module/portfolio/tags/repository/tag.repository";
import { tagRouter } from "./module/portfolio/tags/routes/tag.routes";
import TagService from "./module/portfolio/tags/service/tag.service";
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
const experienceController = new ExperienceController(
  new ExperienceService(new ExperienceRepository(dataSource)),
  messageRepository,
);
const tagController = new TagController(
  new TagService(new TagRepository(dataSource)),
  messageRepository,
);
const certificationController = new CertificationController(
  new CertificationService(new CertificationRepository(dataSource)),
  messageRepository,
);

app.use(
  cors({
    origin: ["https://portfoliofrontend-dkvq0mq5j-k1s-projects-ff94b943.vercel.app"],
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
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
app.use(experienceRouter(experienceController, jwt, messageRepository));
app.use(tagRouter(tagController, jwt, messageRepository));
app.use(certificationRouter(certificationController, jwt, messageRepository));

export default app;
