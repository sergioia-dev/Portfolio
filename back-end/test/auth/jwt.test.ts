import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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

  assert.equal(payload.sub, sub);
  assert.equal(payload.email, email);
  assert.equal(payload.role, role);
  assert.deepEqual(payload.permissions, permissions);
  assert.ok(payload.iat !== undefined && payload.exp !== undefined);
  assert.ok(Math.abs((payload.exp! - payload.iat!) - 900) <= 5);
});

test("refresh token round-trips sub with ~7d expiry", () => {
  const j = new Jwt();
  const token = j.generateRefreshToken(sub);
  const payload = j.verifyRefreshToken(token) as {
    sub: string;
    iat?: number;
    exp?: number;
  };

  assert.equal(payload.sub, sub);
  assert.ok(payload.exp !== undefined && payload.iat !== undefined);
  assert.ok(Math.abs((payload.exp! - payload.iat!) - 604800) <= 5);
});

test("tampered access token throws", () => {
  const j = new Jwt();
  const token = j.generateAccessToken(sub, email, role, permissions);
  const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");

  assert.throws(() => j.verifyAccessToken(tampered), jwt.JsonWebTokenError);
});

test("cross-secret verification throws", () => {
  const j = new Jwt();
  const access = j.generateAccessToken(sub, email, role, permissions);
  const refresh = j.generateRefreshToken(sub);

  assert.throws(
    () => jwt.verify(access, process.env.JWT_REFRESH_SECRET!),
    jwt.JsonWebTokenError,
  );
  assert.throws(
    () => jwt.verify(refresh, process.env.JWT_ACCESS_SECRET!),
    jwt.JsonWebTokenError,
  );
});

test("expired access token throws TokenExpiredError", () => {
  const j = new Jwt();
  const expired = jwt.sign(
    { sub, email, role, permissions, exp: Math.floor(Date.now() / 1000) - 60 },
    process.env.JWT_ACCESS_SECRET!,
  );

  assert.throws(() => j.verifyAccessToken(expired), jwt.TokenExpiredError);
});

test("missing JWT secrets make startup throw", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "-e",
      `import("./src/shared/security/configuration/environment.ts").then(() => { console.error("NO_THROW"); process.exit(2); }, (e) => { console.error(e.message); process.exit(0); });`,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        ENV_MODE: "development",
        API_PORT: "5678",
        DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/postgres",
        JWT_ACCESS_SECRET: "",
        JWT_REFRESH_SECRET: "",
      },
    },
  );

  assert.equal(result.status, 0);
  assert.match(result.stderr, /Environment Variables misconfigured/);
});
