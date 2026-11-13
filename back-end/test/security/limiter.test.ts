import type { Request, Response } from "express";
import { requestLimiter, speedLimiter } from "../../src/shared/security/rate-limiting/limiter";

test("rate limiters are express middleware functions", () => {
  expect(typeof requestLimiter).toBe("function");
  expect(typeof speedLimiter).toBe("function");
});

test("speed limiter delays requests past the threshold", async () => {
  jest.useFakeTimers();
  const request = {
    ip: "127.0.0.1",
    app: { get: () => false },
    headers: {},
    socket: {},
  } as unknown as Request;
  const response = {
    on: jest.fn(),
    setHeader: jest.fn(),
    status: jest.fn(),
    send: jest.fn(),
  } as unknown as Response;
  const next = jest.fn();

  try {
    for (let hit = 1; hit <= 50; hit++) {
      await speedLimiter(request, response, next);
    }
    expect(next).toHaveBeenCalledTimes(50);

    const delayed = speedLimiter(request, response, next);
    await jest.advanceTimersByTimeAsync(5200);
    await delayed;

    expect(next).toHaveBeenCalledTimes(51);
  } finally {
    jest.useRealTimers();
  }
});
