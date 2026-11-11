import knex, { Knex } from "knex";
import config from "../../knexfile";
import environment from "../shared/security/configuration/environment";

const env = environment.MODE;
const knexConfig: Knex.Config = config[env];

const db: Knex = knex(knexConfig);

export default db;
