import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { unitsTable } from "@workspace/db/schema";
import { requireRole } from "../middlewares/auth";
import { MULTI_TENANT_STRICT } from "../lib/tenancy";
import { logger } from "../lib/logger";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get(
  "/units",
  requireRole("USER"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: userId, organizationId } = req.user!;

      if (!organizationId) {
        if (MULTI_TENANT_STRICT) {
          logger.warn({ userId }, "[GET /units] MULTI_TENANT_STRICT: organization_id missing — refusing request");
          res.status(403).json({
            error: "Tenant context missing: organization_id was not found in the JWT app_metadata.",
          });
          return;
        }
        logger.warn({ userId }, "[GET /units] no organization_id in app_metadata — returning unscoped results (single-tenant mode)");
      }

      const rows = organizationId
        ? await db.select().from(unitsTable).where(eq(unitsTable.organizationId, organizationId))
        : await db.select().from(unitsTable);

      res.json({ data: rows });
    } catch (err) {
      logger.error({ err }, "[GET /units] query failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
