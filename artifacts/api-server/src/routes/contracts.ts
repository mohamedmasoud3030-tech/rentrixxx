import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { contractsTable } from "@workspace/db/schema";
import { requireRole } from "../middlewares/auth";
import { MULTI_TENANT_STRICT } from "../lib/tenancy";
import { logger } from "../lib/logger";
import { and, isNull, eq } from "drizzle-orm";

const router: IRouter = Router();

/**
 * Map Drizzle/DB column names to the frontend Contract shape.
 * The DB uses snake_case-derived camelCase names (rentAmount, startDate, endDate)
 * while the frontend types.ts Contract interface uses abbreviated aliases
 * (rent, start, end) — normalize here to avoid breaking downstream UI.
 */
function toFrontendContract(row: typeof contractsTable.$inferSelect) {
  return {
    id: row.id,
    no: row.no,
    unitId: row.unitId,
    tenantId: row.tenantId,
    rent: row.rentAmount !== null ? Number(row.rentAmount) : 0,
    dueDay: row.dueDay,
    start: row.startDate,
    end: row.endDate,
    deposit: row.deposit !== null ? Number(row.deposit) : 0,
    status: row.status,
    deletedAt: row.deletedAt,
    sponsorName: row.sponsorName,
    sponsorId: row.sponsorId,
    sponsorPhone: row.sponsorPhone,
    isDemo: row.isDemo,
    organizationId: row.organizationId,
    endedAt: row.endedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

router.get(
  "/contracts",
  requireRole("USER"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: userId, organizationId } = req.user!;

      if (!organizationId) {
        if (MULTI_TENANT_STRICT) {
          logger.warn({ userId }, "[GET /contracts] MULTI_TENANT_STRICT: organization_id missing — refusing request");
          res.status(403).json({
            error: "Tenant context missing: organization_id was not found in the JWT app_metadata.",
          });
          return;
        }
        logger.warn({ userId }, "[GET /contracts] no organization_id in app_metadata — returning unscoped results (single-tenant mode)");
      }

      const rows = organizationId
        ? await db
            .select()
            .from(contractsTable)
            .where(and(isNull(contractsTable.deletedAt), eq(contractsTable.organizationId, organizationId)))
        : await db.select().from(contractsTable).where(isNull(contractsTable.deletedAt));

      res.json({ data: rows.map(toFrontendContract) });
    } catch (err) {
      logger.error({ err }, "[GET /contracts] query failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
