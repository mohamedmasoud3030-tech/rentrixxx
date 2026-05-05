import app from "./app";
import { logger } from "./lib/logger";

const hasJwtSecret = Boolean(process.env["SUPABASE_JWT_SECRET"]);
const hasSupabaseUrl = Boolean(
  process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"],
);

if (hasJwtSecret) {
  logger.info(
    "SUPABASE_JWT_SECRET loaded — JWT signature verification active on all protected routes.",
  );
} else {
  logger.warn(
    "SUPABASE_JWT_SECRET is not set — all protected endpoints will return 401. " +
    "Add the secret from Supabase project settings → API → JWT Settings → JWT Secret.",
  );
}

if (hasSupabaseUrl) {
  logger.info(
    "SUPABASE_URL resolved — JWT issuer validation is active (expected issuer: <url>/auth/v1).",
  );
} else {
  logger.warn(
    "Neither SUPABASE_URL nor VITE_SUPABASE_URL is set — " +
    "JWT issuer validation is disabled. Set SUPABASE_URL to harden auth.",
  );
}

const rawPort = process.env["PORT"];
const port = rawPort ? Number(rawPort) : 3000;

if (rawPort && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
