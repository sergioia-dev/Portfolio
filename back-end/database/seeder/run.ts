import "reflect-metadata";
import dataSource from "../../src/shared/database/data-source";
import providerSeeder from "./provider_seeder";
import languageSeeder from "./language_seeder";
import exceptionSeeder from "./exception_seeder";

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
