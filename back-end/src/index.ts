import "reflect-metadata";
import app from "./app";
import dataSource from "./shared/database/data-source";
import environment from "./shared/security/configuration/environment";

dataSource
  .initialize()
  .then(() => {
    app.listen(environment.API);
    console.log("API running on Port : ", environment.API);
  })
  .catch((error) => {
    console.error("!!! Error initializing database :\n", error);
    process.exit(1);
  });
