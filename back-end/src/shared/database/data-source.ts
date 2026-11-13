import "reflect-metadata";
import { DataSource } from "typeorm";
import environment from "../security/configuration/environment";

const dataSource = new DataSource({
  type: "postgres",
  url: environment.DATABASE_URL as string,
  entities: [`${__dirname}/**/*.entity.{ts,js}`],
  migrations: [`${__dirname}/migrations/*.{ts,js}`],
  synchronize: false,
});

export default dataSource;
