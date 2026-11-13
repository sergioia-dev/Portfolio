import cors from "cors";
import express from "express";
import helmet from "helmet";
import { requestLimiter, speedLimiter } from "./shared/security/rate-limiting/limiter";

const app = express();

app.use(
  cors({
    origin: ["https://portfoliofrontend-dkvq0mq5j-k1s-projects-ff94b943.vercel.app/"],
    methods: ["GET"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(speedLimiter);
app.use(requestLimiter);

export default app;
