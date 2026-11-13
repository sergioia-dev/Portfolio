import jwt from "jsonwebtoken";
import Jwt from "../../src/shared/security/jwt/jwt";

const sub = "123e4567-e89b-12d3-a456-426614174000";
const email = "user@example.com";
const role = "ADMIN";
const permissions = ["CREATE_BLOG", "APPROVE_BLOG"];

test("access token round-trips all claims with ~15m expiry", () => {
  const j = new Jwt();
  const token = j.generateAccessToken(sub, email, role, permissions);
  const payload = j.verifyAccessToken(token);

  expect(payload.sub).toBe(sub);
  expect(payload.email).toBe(email);
  expect(payload.role).toBe(role);
  expect(payload.permissions).toEqual(permissions);
  expect(payload.iat).toBeDefined();
  expect(payload.exp).toBeDefined();
  expect(Math.abs(Number(payload.exp) - Number(payload.iat) - 900)).toBeLessThanOrEqual(5);
});

test("refresh token round-trips sub with ~7d expiry", () => {
  const j = new Jwt();
  const token = j.generateRefreshToken(sub);
  const payload = j.verifyRefreshToken(token) as {
    sub: string;
    iat?: number;
    exp?: number;
  };

  expect(payload.sub).toBe(sub);
  expect(payload.exp).toBeDefined();
  expect(payload.iat).toBeDefined();
  expect(Math.abs(Number(payload.exp) - Number(payload.iat) - 604800)).toBeLessThanOrEqual(5);
});

test("tampered access token throws", () => {
  const j = new Jwt();
  const token = j.generateAccessToken(sub, email, role, permissions);
  const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");

  expect(() => j.verifyAccessToken(tampered)).toThrow(jwt.JsonWebTokenError);
});

test("cross-secret verification throws", () => {
  const j = new Jwt();
  const access = j.generateAccessToken(sub, email, role, permissions);
  const refresh = j.generateRefreshToken(sub);

  expect(() => jwt.verify(access, process.env.JWT_REFRESH_SECRET as string)).toThrow(
    jwt.JsonWebTokenError,
  );
  expect(() => jwt.verify(refresh, process.env.JWT_ACCESS_SECRET as string)).toThrow(
    jwt.JsonWebTokenError,
  );
});

test("expired access token throws TokenExpiredError", () => {
  const j = new Jwt();
  const expired = jwt.sign(
    { sub, email, role, permissions, exp: Math.floor(Date.now() / 1000) - 60 },
    process.env.JWT_ACCESS_SECRET as string,
  );

  expect(() => j.verifyAccessToken(expired)).toThrow(jwt.TokenExpiredError);
});

test("missing JWT secrets make startup throw", () => {
  const variables = [
    "ENV_MODE",
    "API_PORT",
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "JWT_ACCESS_EXPIRATION",
    "JWT_REFRESH_EXPIRATION",
  ];
  const saved = Object.fromEntries(variables.map((key) => [key, process.env[key]]));

  for (const key of variables) process.env[key] = "";
  jest.resetModules();

  try {
    jest.isolateModules(() => {
      expect(() => require("../../src/shared/security/configuration/environment")).toThrow(
        /Environment Variables misconfigured/,
      );
    });
  } finally {
    for (const key of variables) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    jest.resetModules();
  }
});
