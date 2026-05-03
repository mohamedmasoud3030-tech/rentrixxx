import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { propertiesTable } from "@workspace/db/schema";
import { requireRole } from "../middlewares/auth";
import { assertPeriodUnlocked, LockedPeriodError, ReadOnlyModeError } from "../lib/governance";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get(
  "/properties",
  requireRole("USER"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const rows = await db
        .select({
          id: propertiesTable.id,
          name: propertiesTable.name,
          type: propertiesTable.type,
          location: propertiesTable.location,
          ownerId: propertiesTable.ownerId,
          organizationId: propertiesTable.organizationId,
          createdAt: propertiesTable.createdAt,
        })
        .from(propertiesTable);

      res.json({ data: rows, requestedBy: req.user!.id, role: req.user!.role });
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
