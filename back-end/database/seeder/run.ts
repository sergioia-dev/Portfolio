import "reflect-metadata";
import dataSource from "../../src/shared/database/data-source";
import exceptionSeeder from "./exception_seeder";
import languageSeeder from "./language_seeder";
import providerSeeder from "./provider_seeder";

dataSource
  .initialize()
  .then(async () => {
    await providerSeeder(dataSource);
    await languageSeeder(dataSource);
    await exceptionSeeder(dataSource);
    await dataSource.destroy();
    console.log("Seeds applied");
  })
  .catch((error) => {
    console.error("!!! Error running seeds :\n", error);
    process.exit(1);
  });
