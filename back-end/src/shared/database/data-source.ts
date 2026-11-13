import "reflect-metadata";
import { DataSource } from "typeorm";
import environment from "../security/configuration/environment";

const dataSource = new DataSource({
  type: "postgres",
  url: environment.DATABASE_URL as string,
  entities: [`${__dirname}/**/*.entity.{ts,js}`],
  synchronize: true,
});

export default dataSource;
