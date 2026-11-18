import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import AdministrationController from "./module/administration/controller/administration.controller";
import AdministrationRepository from "./module/administration/repository/administration.repository";
import { administrationRouter } from "./module/administration/routes/administration.routes";
import AdministrationService from "./module/administration/service/administration.service";
import ArticleController from "./module/articles/controller/article.controller";
import CommentController from "./module/articles/controller/comment.controller";
import ArticleRepository from "./module/articles/repository/article.repository";
import CommentRepository from "./module/articles/repository/comment.repository";
import { articleRouter } from "./module/articles/routes/article.routes";
import { commentRouter } from "./module/articles/routes/comment.routes";
import ArticleService from "./module/articles/service/article.service";
import CommentService from "./module/articles/service/comment.service";
import AuthController from "./module/auth/controller/auth.controller";
import AuthRepository from "./module/auth/repository/auth.repository";
import MessageRepository from "./module/auth/repository/message.repository";
import { authRouter } from "./module/auth/routes/auth.routes";
import AuthService, { BcryptPasswordHasher } from "./module/auth/service/auth.service";
import CertificationController from "./module/portfolio/certifications/controller/certification.controller";
import CertificationRepository from "./module/portfolio/certifications/repository/certification.repository";
import { certificationRouter } from "./module/portfolio/certifications/routes/certification.routes";
import CertificationService from "./module/portfolio/certifications/service/certification.service";
import ContributionController from "./module/portfolio/contributions/controller/contribution.controller";
import ContributionRepository from "./module/portfolio/contributions/repository/contribution.repository";
import { contributionRouter } from "./module/portfolio/contributions/routes/contribution.routes";
import ContributionService from "./module/portfolio/contributions/service/contribution.service";
import ExperienceController from "./module/portfolio/experiences/controller/experience.controller";
import ExperienceRepository from "./module/portfolio/experiences/repository/experience.repository";
import { experienceRouter } from "./module/portfolio/experiences/routes/experience.routes";
import ExperienceService from "./module/portfolio/experiences/service/experience.service";
import ProjectController from "./module/portfolio/projects/controller/project.controller";
import ProjectRepository from "./module/portfolio/projects/repository/project.repository";
import { projectRouter } from "./module/portfolio/projects/routes/project.routes";
import ProjectService from "./module/portfolio/projects/service/project.service";
import TagController from "./module/portfolio/tags/controller/tag.controller";
import TagRepository from "./module/portfolio/tags/repository/tag.repository";
import { tagRouter } from "./module/portfolio/tags/routes/tag.routes";
import TagService from "./module/portfolio/tags/service/tag.service";
import UserController from "./module/users/controller/user.controller";
import UserRepository from "./module/users/repository/user.repository";
import { userRouter } from "./module/users/routes/user.routes";
import UserService from "./module/users/service/user.service";
import dataSource from "./shared/database/data-source";
import Jwt from "./shared/security/jwt/jwt";
import { requestLimiter, speedLimiter } from "./shared/security/rate-limiting/limiter";

const app = express();
const jwt = new Jwt();
const messageRepository = new MessageRepository(dataSource);
const userRepository = new UserRepository(dataSource);
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
const projectController = new ProjectController(
  new ProjectService(new ProjectRepository(dataSource)),
  messageRepository,
);
const contributionController = new ContributionController(
  new ContributionService(new ContributionRepository(dataSource)),
  messageRepository,
);
const userController = new UserController(
  new UserService(userRepository, dataSource, new BcryptPasswordHasher()),
  messageRepository,
);
const administrationController = new AdministrationController(
  new AdministrationService(new AdministrationRepository(dataSource)),
  messageRepository,
);
const articleController = new ArticleController(
  new ArticleService(new ArticleRepository(dataSource)),
  messageRepository,
);
const commentController = new CommentController(
  new CommentService(new CommentRepository(dataSource)),
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
app.use("/auth", authRouter(authController));
app.use("/users", userRouter(userController, jwt, messageRepository, userRepository));
app.use(
  "/users/administration",
  administrationRouter(administrationController, jwt, messageRepository, userRepository),
);
app.use(experienceRouter(experienceController, jwt, messageRepository, userRepository));
app.use(tagRouter(tagController, jwt, messageRepository, userRepository));
app.use(certificationRouter(certificationController, jwt, messageRepository, userRepository));
app.use(projectRouter(projectController, jwt, messageRepository, userRepository));
app.use(contributionRouter(contributionController, jwt, messageRepository, userRepository));
app.use(articleRouter(articleController, jwt, messageRepository, userRepository));
app.use(commentRouter(commentController, jwt, messageRepository, userRepository));

export default app;
