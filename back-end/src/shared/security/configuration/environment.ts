const MODE: string | null = String(process.env["ENV_MODE"]) || null;
const API: number | null = Number(process.env.API_PORT) || null;
const DATABASE_URL: string | null = String(process.env.DATABASE_URL) || null;
const JWT_ACCESS_SECRET: string | null = process.env.JWT_ACCESS_SECRET || null;
const JWT_REFRESH_SECRET: string | null = process.env.JWT_REFRESH_SECRET || null;
const JWT_ACCESS_EXPIRATION: string = process.env.JWT_ACCESS_EXPIRATION || "15m";
const JWT_REFRESH_EXPIRATION: string = process.env.JWT_REFRESH_EXPIRATION || "7d";

if (MODE == null || API == null || DATABASE_URL == null || JWT_ACCESS_SECRET == null || JWT_REFRESH_SECRET == null) {
  throw Error(
    "!!!!!!! Environment Variables misconfigured:\n Variables required\n - ENV_MODE\n - API_PORT\n - DATABASE_URL\n - JWT_ACCESS_SECRET\n - JWT_REFRESH_SECRET",
  );
}

export default {
  MODE: MODE,
  API: API,
  DATABASE_URL: DATABASE_URL,
  JWT_ACCESS_SECRET: JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRATION: JWT_ACCESS_EXPIRATION,
  JWT_REFRESH_EXPIRATION: JWT_REFRESH_EXPIRATION,
};
