import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { invoicesTable, contractsTable } from "@workspace/db/schema";
import { requireRole } from "../middlewares/auth";
import { MULTI_TENANT_STRICT } from "../lib/tenancy";
import { logger } from "../lib/logger";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// Validation schemas
const createInvoiceSchema = z.object({
  no: z.string().optional(),
  contractId: z.string().uuid(),
  dueDate: z.string(), // date string
  amount: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().optional(),
  type: z.enum(["RENT", "MAINTENANCE", "UTILITY", "OTHER"]),
  notes: z.string().optional(),
  relatedInvoiceId: z.string().uuid().optional(),
});

const updateInvoiceSchema = z.object({
  dueDate: z.string().optional(),
  amount: z.number().nonnegative().optional(),
  taxAmount: z.number().nonnegative().optional(),
  paidAmount: z.number().nonnegative().optional(),
  status: z.enum(["PENDING", "PAID", "PARTIAL", "OVERDUE", "CANCELLED"]).optional(),
  type: z.enum(["RENT", "MAINTENANCE", "UTILITY", "OTHER"]).optional(),
  notes: z.string().optional(),
  paymentMethod: z.string().optional(),
  externalPaymentRef: z.string().optional(),
});

/**
 * Helper to get org contract IDs
 */
async function getOrgContractIds(organizationId: string): Promise<string[]> {
  const orgContracts = await db
    .select({ id: contractsTable.id })
    .from(contractsTable)
    .where(eq(contractsTable.organizationId, organizationId));
  return orgContracts.map(c => c.id);
}

/**
 * GET /invoices
 * List all invoices for the organization
 */
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
        const rows = await db.select().from(invoicesTable);
        res.json({ data: rows });
        return;
      }

      const contractIds = await getOrgContractIds(organizationId);

      const rows = contractIds.length > 0
        ? await db.select().from(invoicesTable).where(inArray(invoicesTable.contractId, contractIds))
        : [];

      res.json({ data: rows });
    } catch (err) {
      logger.error({ err }, "[GET /invoices] query failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * GET /invoices/:id
 * Get a single invoice by ID
 */
router.get(
  "/invoices/:id",
  requireRole("USER"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const invoiceId = req.params['id'] as string;
      const { organizationId } = req.user!;

      if (!invoiceId) {
        res.status(400).json({ error: "Invoice ID is required" });
        return;
      }

      const [row] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoiceId)).limit(1);

      if (!row) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }

      // If organizationId is set, verify the invoice belongs to the org
      if (organizationId) {
        const contractIds = await getOrgContractIds(organizationId);
        if (!contractIds.includes(row.contractId ?? '')) {
          res.status(404).json({ error: "Invoice not found" });
          return;
        }
      }

      res.json({ data: row });
    } catch (err) {
      logger.error({ err }, "[GET /invoices/:id] query failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * POST /invoices
 * Create a new invoice
 */
router.post(
  "/invoices",
  requireRole("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId, id: userId } = req.user!;

      if (!organizationId && MULTI_TENANT_STRICT) {
        res.status(403).json({ error: "Organization context required" });
        return;
      }

      // Validate input
      const parseResult = createInvoiceSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.issues
        });
        return;
      }

      const body = parseResult.data;

      // Verify contract exists and belongs to organization
      if (organizationId) {
        const contractIds = await getOrgContractIds(organizationId);
        if (!contractIds.includes(body.contractId)) {
          res.status(400).json({ error: "Invalid contract ID" });
          return;
        }
      }

      // Generate ID and timestamps
      
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      // Generate invoice number if not provided
      const invoiceNo = body.no ?? `INV-${Date.now().toString(36).toUpperCase()}`;

      const [newInvoice] = await db.insert(invoicesTable).values({
        id,
        no: invoiceNo,
        contractId: body.contractId,
        dueDate: body.dueDate,
        amount: body.amount.toString(),
        taxAmount: body.taxAmount?.toString() ?? null,
        paidAmount: "0",
        status: "PENDING",
        type: body.type,
        notes: body.notes ?? "",
        relatedInvoiceId: body.relatedInvoiceId ?? null,
        createdAt: now,
        updatedAt: now,
      }).returning();

      logger.info({ invoiceId: id, userId }, "[POST /invoices] created");
      res.status(201).json({ data: newInvoice });
    } catch (err) {
      logger.error({ err }, "[POST /invoices] failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * PATCH /invoices/:id
 * Update an existing invoice
 */
router.patch(
  "/invoices/:id",
  requireRole("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const invoiceId = req.params['id'] as string;
      const { organizationId, id: userId } = req.user!;

      if (!invoiceId) {
        res.status(400).json({ error: "Invoice ID is required" });
        return;
      }

      // Validate input
      const parseResult = updateInvoiceSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.issues
        });
        return;
      }

      const body = parseResult.data;

      // Check if invoice exists
      const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoiceId)).limit(1);

      if (!existing) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }

      // If organizationId is set, verify the invoice belongs to the org
      if (organizationId) {
        const contractIds = await getOrgContractIds(organizationId);
        if (!contractIds.includes(existing.contractId ?? '')) {
          res.status(404).json({ error: "Invoice not found" });
          return;
        }
      }

      // Build update object
      const updates: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };

      if (body.dueDate !== undefined) updates.dueDate = body.dueDate;
      if (body.amount !== undefined) updates.amount = body.amount.toString();
      if (body.taxAmount !== undefined) updates.taxAmount = body.taxAmount?.toString();
      if (body.paidAmount !== undefined) updates.paidAmount = body.paidAmount.toString();
      if (body.status !== undefined) updates.status = body.status;
      if (body.type !== undefined) updates.type = body.type;
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.paymentMethod !== undefined) updates.paymentMethod = body.paymentMethod;
      if (body.externalPaymentRef !== undefined) updates.externalPaymentRef = body.externalPaymentRef;

      const [updated] = await db
        .update(invoicesTable)
        .set(updates)
        .where(eq(invoicesTable.id, invoiceId))
        .returning();

      logger.info({ invoiceId, userId }, "[PATCH /invoices/:id] updated");
      res.json({ data: updated });
    } catch (err) {
      logger.error({ err }, "[PATCH /invoices/:id] failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * DELETE /invoices/:id
 * Delete an invoice (only if not paid)
 */
router.delete(
  "/invoices/:id",
  requireRole("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const invoiceId = req.params['id'] as string;
      const { organizationId, id: userId } = req.user!;

      if (!invoiceId) {
        res.status(400).json({ error: "Invoice ID is required" });
        return;
      }

      // Check if invoice exists
      const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoiceId)).limit(1);

      if (!existing) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }

      // If organizationId is set, verify the invoice belongs to the org
      if (organizationId) {
        const contractIds = await getOrgContractIds(organizationId);
        if (!contractIds.includes(existing.contractId ?? '')) {
          res.status(404).json({ error: "Invoice not found" });
          return;
        }
      }

      // Prevent deletion of paid invoices
      if (existing.status === "PAID" || Number(existing.paidAmount) > 0) {
        res.status(409).json({
          error: "Cannot delete a paid invoice. Consider cancelling it instead."
        });
        return;
      }

      // Hard delete for unpaid invoices
      await db.delete(invoicesTable).where(eq(invoicesTable.id, invoiceId));

      logger.info({ invoiceId, userId }, "[DELETE /invoices/:id] deleted");
      res.json({ success: true, message: "Invoice deleted" });
    } catch (err) {
      logger.error({ err }, "[DELETE /invoices/:id] failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;