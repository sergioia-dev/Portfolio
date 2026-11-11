const MODE: string | null = String(process.env["ENV_MODE"]) || null;
const API: number | null = Number(process.env.API_PORT) || null;
const DATABASE_URL: string | null = String(process.env.DATABASE_URL) || null;

if (MODE == null || API == null || DATABASE_URL == null) {
  throw Error(
    "!!!!!!! Environment Variables misconfigured:\n Variables required\n - ENV_MODE\n - API_PORT\n - DATABASE_URL",
  );
}

export default {
  MODE: MODE,
  API: API,
  DATABASE_URL: DATABASE_URL,
};
