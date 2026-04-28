const ALLOWED_ORIGINS_ENV = Deno.env.get("ALLOWED_ORIGINS");
const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:5173", "*.vercel.app"];

const allowedOrigins = ALLOWED_ORIGINS_ENV
  ? ALLOWED_ORIGINS_ENV.split(",").map((s) => s.trim())
  : DEFAULT_ALLOWED_ORIGINS;

export const corsHeaders = (origin: string | null) => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-api-key, x-request-id, content-type",
  };

  if (origin) {
    const isOriginAllowed = allowedOrigins.some(allowed => {
      if (allowed.startsWith("*")) {
        const domain = allowed.substring(1);
        return origin.endsWith(domain);
      } else {
        return origin === allowed;
      }
    });

    if (isOriginAllowed) {
      headers["Access-Control-Allow-Origin"] = origin;
    } else {
      // If origin is not allowed, do not set Access-Control-Allow-Origin
      // This will effectively block the request by the browser
    }
  } else {
    // If no origin header is present (e.g., direct server-to-server request),
    // we can allow it or apply a default policy. For now, we'll allow it.
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return headers;
};

export const handleOptions = (req: Request): Response => {
  const origin = req.headers.get("Origin");
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
};
