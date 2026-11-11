import app from "./app";
import environment from "./shared/security/configuration/environment";

app.listen(environment.API);

console.log("API running on Port : ", environment.API);
