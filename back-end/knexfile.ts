import type { Knex } from "knex";
import environment from "./src/shared/security/configuration/environment";

const config: Record<string, Knex.Config> = {
  development: {
    client: "pg",
    connection: environment.DATABASE_URL,
    migrations: {
      directory: "./src/database/migrations",
      extension: "ts",
    },
    seeds: {
      directory: "./src/database/seeds",
    },
    debug: true, // logs SQL queries
  },

  production: {
    client: "pg",
    connection: environment.DATABASE_URL,
    migrations: {
      directory: "./src/database/migrations",
    },
    pool: {
      min: 2,
      max: 10,
    },
  },
};

export default config;
