import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { invoicesTable, contractsTable } from "@workspace/db/schema";
import { requireRole } from "../middlewares/auth";
import { MULTI_TENANT_STRICT } from "../lib/tenancy";
import { logger } from "../lib/logger";
import { eq, inArray } from "drizzle-orm";

const router: IRouter = Router();

router.get(
  "/invoices",
  requireRole("USER"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: userId, organizationId } = req.user!;

      if (!organizationId) {
        if (MULTI_TENANT_STRICT) {
          logger.warn({ userId }, "[GET /invoices] MULTI_TENANT_STRICT: organization_id missing — refusing request");
          res.status(403).json({
            error: "Tenant context missing: organization_id was not found in the JWT app_metadata.",
          });
          return;
        }
        logger.warn({ userId }, "[GET /invoices] no organization_id in app_metadata — returning unscoped results (single-tenant mode)");
      }

      let rows;

      if (organizationId) {
        // Invoices have no direct organizationId column — scope through contracts
        const orgContracts = await db
          .select({ id: contractsTable.id })
          .from(contractsTable)
          .where(eq(contractsTable.organizationId, organizationId));

        const contractIds = orgContracts.map(c => c.id);

        rows = contractIds.length > 0
          ? await db.select().from(invoicesTable).where(inArray(invoicesTable.contractId, contractIds))
          : [];
      } else {
        rows = await db.select().from(invoicesTable);
      }

      res.json({ data: rows });
    } catch (err) {
      logger.error({ err }, "[GET /invoices] query failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
