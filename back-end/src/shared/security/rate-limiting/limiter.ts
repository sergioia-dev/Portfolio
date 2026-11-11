import { rateLimit } from "express-rate-limit";
import slowDown from "express-slow-down";

const requestLimiter = rateLimit({
  // set a Limit to the number of request per IP to 100 for 15m
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56,
  message: "Too many request",
});

const speedLimiter = slowDown({
  // spread out the incoming request over time, increment the time per request to be response for 100ms depending of request
  // 1-50 0ms,
  //  > 50 , 100ms * numberRequest - 50
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: (hits) => hits * 100,
});

export { requestLimiter, speedLimiter };
