import app from "./app";
import { logger } from "./lib/logger";

if (process.env["SUPABASE_JWT_SECRET"]) {
  logger.info("SUPABASE_JWT_SECRET loaded — JWT verification is active on all protected routes.");
} else {
  logger.warn(
    "SUPABASE_JWT_SECRET is not set — all protected endpoints will return 401. " +
    "Add the secret from Supabase project settings → API → JWT Settings → JWT Secret.",
  );
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
