import express from "express";
import blogRouter from "./controller/blogs_controller";
import tagRouter from "./controller/tags_controller";
import projectRouter from "./controller/projects_controller";
import {
  speedLimiter,
  requestLimiter,
} from "./shared/security/rate-limiting/limiter";
import cors from "cors";
import helmet from "helmet";

const app = express();

app.use(
  cors({
    origin: [
      "https://portfoliofrontend-dkvq0mq5j-k1s-projects-ff94b943.vercel.app/",
    ],
    methods: ["GET"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(speedLimiter);
app.use(requestLimiter);
app.use("/api/v1", blogRouter);
app.use("/api/v1", tagRouter);
app.use("/api/v1", projectRouter);

export default app;
