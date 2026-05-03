import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { propertiesTable } from "@workspace/db/schema";
import { requireRole } from "../middlewares/auth";
import { assertPeriodUnlocked, LockedPeriodError, ReadOnlyModeError } from "../lib/governance";
import { MULTI_TENANT_STRICT } from "../lib/tenancy";
import { logger } from "../lib/logger";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get(
  "/properties",
  requireRole("USER"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: userId, role, organizationId } = req.user!;

      if (!organizationId) {
        if (MULTI_TENANT_STRICT) {
          logger.warn({ userId }, "[GET /properties] MULTI_TENANT_STRICT: organization_id missing from JWT app_metadata — refusing request");
          res.status(403).json({
            error: "Tenant context missing: organization_id was not found in the JWT app_metadata. " +
              "Ensure the Supabase custom access token hook is active and injects organization_id.",
          });
          return;
        }
        logger.warn({ userId }, "[GET /properties] no organization_id in app_metadata — returning unscoped results (single-tenant mode)");
      }

      // Select all columns so the frontend receives the full property shape
      // it previously got via supabase fetchAll (no field truncation).
      const rows = organizationId
        ? await db.select().from(propertiesTable).where(eq(propertiesTable.organizationId, organizationId))
        : await db.select().from(propertiesTable);

      res.json({ data: rows, requestedBy: userId, role });
    } catch (err) {
      logger.error({ err }, "[GET /properties] query failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.patch(
  "/properties/:id",
  requireRole("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await assertPeriodUnlocked(new Date());
    } catch (err) {
      if (err instanceof LockedPeriodError || err instanceof ReadOnlyModeError) {
        res.status(423).json({ error: (err as Error).message });
        return;
      }
      logger.error({ err }, "[PATCH /properties/:id] governance check failed");
      res.status(500).json({ error: "Internal server error" });
      return;
    }

    res.status(501).json({ message: "Not yet implemented" });
  },
);

export default router;
