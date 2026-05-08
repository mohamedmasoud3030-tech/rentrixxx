import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { contractsTable } from "@workspace/db/schema";
import { requireRole } from "../middlewares/auth";
import { MULTI_TENANT_STRICT } from "../lib/tenancy";
import { logger } from "../lib/logger";
import { and, isNull, eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// Validation schemas
const createContractSchema = z.object({
  no: z.string().optional(),
  unitId: z.string().uuid(),
  tenantId: z.string().uuid(),
  rent: z.number().positive(),
  dueDay: z.number().int().min(1).max(31),
  start: z.string(), // date string
  end: z.string(), // date string
  deposit: z.number().nonnegative().optional(),
  sponsorName: z.string().optional(),
  sponsorId: z.string().optional(),
  sponsorPhone: z.string().optional(),
});

const updateContractSchema = z.object({
  no: z.string().optional(),
  unitId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  rent: z.number().positive().optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  deposit: z.number().nonnegative().optional(),
  sponsorName: z.string().optional(),
  sponsorId: z.string().optional(),
  sponsorPhone: z.string().optional(),
  status: z.enum(["ACTIVE", "ENDED", "PENDING"]).optional(),
});

/**
 * Map Drizzle/DB column names to the frontend Contract shape.
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

/**
 * GET /contracts
 * List all contracts for the organization
 */
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

/**
 * GET /contracts/:id
 * Get a single contract by ID
 */
router.get(
  "/contracts/:id",
  requireRole("USER"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const contractId = req.params['id'] as string;
      const { organizationId } = req.user!;

      if (!contractId) {
        res.status(400).json({ error: "Contract ID is required" });
        return;
      }

      const query = organizationId
        ? and(
            eq(contractsTable.id, contractId),
            eq(contractsTable.organizationId, organizationId),
            isNull(contractsTable.deletedAt)
          )
        : and(
            eq(contractsTable.id, contractId),
            isNull(contractsTable.deletedAt)
          );

      const [row] = await db.select().from(contractsTable).where(query).limit(1);

      if (!row) {
        res.status(404).json({ error: "Contract not found" });
        return;
      }

      res.json({ data: toFrontendContract(row) });
    } catch (err) {
      logger.error({ err }, "[GET /contracts/:id] query failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * POST /contracts
 * Create a new contract
 */
router.post(
  "/contracts",
  requireRole("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId, id: userId } = req.user!;

      if (!organizationId && MULTI_TENANT_STRICT) {
        res.status(403).json({ error: "Organization context required" });
        return;
      }

      // Validate input
      const parseResult = createContractSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.issues
        });
        return;
      }

      const body = parseResult.data;

      // Generate ID and timestamps
      
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      // Generate contract number if not provided
      const contractNo = body.no ?? `CNT-${Date.now().toString(36).toUpperCase()}`;

      const [newContract] = await db.insert(contractsTable).values({
        id,
        no: contractNo,
        unitId: body.unitId,
        tenantId: body.tenantId,
        rentAmount: body.rent.toString(),
        dueDay: body.dueDay,
        startDate: body.start,
        endDate: body.end,
        deposit: (body.deposit ?? 0).toString(),
        status: "ACTIVE",
        sponsorName: body.sponsorName ?? null,
        sponsorId: body.sponsorId ?? null,
        sponsorPhone: body.sponsorPhone ?? null,
        organizationId: organizationId ?? null,
        createdAt: now,
        updatedAt: now,
      }).returning();

      logger.info({ contractId: id, userId }, "[POST /contracts] created");
      res.status(201).json({ data: toFrontendContract(newContract) });
    } catch (err) {
      logger.error({ err }, "[POST /contracts] failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * PATCH /contracts/:id
 * Update an existing contract
 */
router.patch(
  "/contracts/:id",
  requireRole("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const contractId = req.params['id'] as string;
      const { organizationId, id: userId } = req.user!;

      if (!contractId) {
        res.status(400).json({ error: "Contract ID is required" });
        return;
      }

      // Validate input
      const parseResult = updateContractSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.issues
        });
        return;
      }

      const body = parseResult.data;

      // Check if contract exists
      const query = organizationId
        ? and(
            eq(contractsTable.id, contractId),
            eq(contractsTable.organizationId, organizationId),
            isNull(contractsTable.deletedAt)
          )
        : and(
            eq(contractsTable.id, contractId),
            isNull(contractsTable.deletedAt)
          );

      const [existing] = await db.select().from(contractsTable).where(query).limit(1);

      if (!existing) {
        res.status(404).json({ error: "Contract not found" });
        return;
      }

      // Build update object
      const updates: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };

      if (body.no !== undefined) updates.no = body.no;
      if (body.unitId !== undefined) updates.unitId = body.unitId;
      if (body.tenantId !== undefined) updates.tenantId = body.tenantId;
      if (body.rent !== undefined) updates.rentAmount = body.rent.toString();
      if (body.dueDay !== undefined) updates.dueDay = body.dueDay;
      if (body.start !== undefined) updates.startDate = body.start;
      if (body.end !== undefined) updates.endDate = body.end;
      if (body.deposit !== undefined) updates.deposit = body.deposit.toString();
      if (body.sponsorName !== undefined) updates.sponsorName = body.sponsorName;
      if (body.sponsorId !== undefined) updates.sponsorId = body.sponsorId;
      if (body.sponsorPhone !== undefined) updates.sponsorPhone = body.sponsorPhone;
      if (body.status !== undefined) {
        updates.status = body.status;
        if (body.status === "ENDED") {
          updates.endedAt = new Date().toISOString();
        }
      }

      const [updated] = await db
        .update(contractsTable)
        .set(updates)
        .where(eq(contractsTable.id, contractId))
        .returning();

      logger.info({ contractId, userId }, "[PATCH /contracts/:id] updated");
      res.json({ data: toFrontendContract(updated) });
    } catch (err) {
      logger.error({ err }, "[PATCH /contracts/:id] failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * DELETE /contracts/:id
 * Delete a contract (soft delete)
 */
router.delete(
  "/contracts/:id",
  requireRole("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const contractId = req.params['id'] as string;
      const { organizationId, id: userId } = req.user!;

      if (!contractId) {
        res.status(400).json({ error: "Contract ID is required" });
        return;
      }

      // Check if contract exists
      const query = organizationId
        ? and(
            eq(contractsTable.id, contractId),
            eq(contractsTable.organizationId, organizationId),
            isNull(contractsTable.deletedAt)
          )
        : and(
            eq(contractsTable.id, contractId),
            isNull(contractsTable.deletedAt)
          );

      const [existing] = await db.select().from(contractsTable).where(query).limit(1);

      if (!existing) {
        res.status(404).json({ error: "Contract not found" });
        return;
      }

      // Soft delete
      const now = new Date().toISOString();
      await db
        .update(contractsTable)
        .set({
          deletedAt: now,
          updatedAt: now,
        })
        .where(eq(contractsTable.id, contractId));

      logger.info({ contractId, userId }, "[DELETE /contracts/:id] deleted");
      res.json({ success: true, message: "Contract deleted" });
    } catch (err) {
      logger.error({ err }, "[DELETE /contracts/:id] failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;