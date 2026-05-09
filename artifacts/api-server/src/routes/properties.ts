import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { propertiesTable, unitsTable } from "@workspace/db/schema";
import { requireRole } from "../middlewares/auth";
import { assertPeriodUnlocked, LockedPeriodError, ReadOnlyModeError } from "../lib/governance";
import { MULTI_TENANT_STRICT } from "../lib/tenancy";
import { logger } from "../lib/logger";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// Validation schema for property updates
const updatePropertySchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  area: z.string().optional(),
  yearBuilt: z.number().int().positive().optional(),
  facilities: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * GET /properties
 * List all properties for the organization
 */
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

/**
 * POST /properties
 * Create a new property
 */
router.post(
  "/properties",
  requireRole("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Check governance
      try {
        await assertPeriodUnlocked(new Date());
      } catch (err) {
        if (err instanceof LockedPeriodError || err instanceof ReadOnlyModeError) {
          res.status(423).json({ error: (err as Error).message });
          return;
        }
        logger.error({ err }, "[POST /properties] governance check failed");
        res.status(500).json({ error: "Internal server error" });
        return;
      }

      const { organizationId } = req.user!;

      if (!organizationId && MULTI_TENANT_STRICT) {
        res.status(403).json({ error: "Organization context required" });
        return;
      }

      const parseResult = updatePropertySchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.issues
        });
        return;
      }

      const body = parseResult.data;

      // Validate required fields for creation
      if (!body.name || !body.type || !body.location) {
        res.status(400).json({
          error: "Missing required fields: name, type, and location are required"
        });
        return;
      }

      
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const [newProperty] = await db.insert(propertiesTable).values({
        id,
        name: body.name,
        type: body.type,
        location: body.location,
        area: body.area ?? null,
        yearBuilt: body.yearBuilt ?? null,
        facilities: body.facilities ?? null,
        notes: body.notes ?? "",
        organizationId: organizationId ?? null,
        createdAt: now,
        updatedAt: now,
      }).returning();

      logger.info({ propertyId: id, userId: req.user!.id }, "[POST /properties] created");
      res.status(201).json({ data: newProperty });
    } catch (err) {
      logger.error({ err }, "[POST /properties] failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * PATCH /properties/:id
 * Update an existing property
 */
router.patch(
  "/properties/:id",
  requireRole("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Check governance
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

      const propertyId = req.params['id'] as string;
      const { organizationId, id: userId } = req.user!;

      if (!propertyId) {
        res.status(400).json({ error: "Property ID is required" });
        return;
      }

      // Validate input
      const parseResult = updatePropertySchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.issues
        });
        return;
      }

      // Check if property exists and belongs to organization
      const existing = organizationId
        ? await db.select().from(propertiesTable).where(
            and(
              eq(propertiesTable.id, propertyId),
              eq(propertiesTable.organizationId, organizationId)
            )
          ).limit(1)
        : await db.select().from(propertiesTable).where(eq(propertiesTable.id, propertyId)).limit(1);

      if (existing.length === 0) {
        res.status(404).json({ error: "Property not found" });
        return;
      }

      // Build update object
      const updates: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };

      const body = parseResult.data;
      if (body.name !== undefined) updates.name = body.name;
      if (body.type !== undefined) updates.type = body.type;
      if (body.location !== undefined) updates.location = body.location;
      if (body.area !== undefined) updates.area = body.area;
      if (body.yearBuilt !== undefined) updates.yearBuilt = body.yearBuilt;
      if (body.facilities !== undefined) updates.facilities = body.facilities;
      if (body.notes !== undefined) updates.notes = body.notes;

      const [updated] = await db
        .update(propertiesTable)
        .set(updates)
        .where(eq(propertiesTable.id, propertyId))
        .returning();

      logger.info({ propertyId, userId }, "[PATCH /properties/:id] updated");
      res.json({ data: updated });
    } catch (err) {
      logger.error({ err }, "[PATCH /properties/:id] failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * DELETE /properties/:id
 * Delete a property (soft delete by setting deletedAt)
 */
router.delete(
  "/properties/:id",
  requireRole("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Check governance
      try {
        await assertPeriodUnlocked(new Date());
      } catch (err) {
        if (err instanceof LockedPeriodError || err instanceof ReadOnlyModeError) {
          res.status(423).json({ error: (err as Error).message });
          return;
        }
        logger.error({ err }, "[DELETE /properties/:id] governance check failed");
        res.status(500).json({ error: "Internal server error" });
        return;
      }

      const propertyId = req.params['id'] as string;
      const { organizationId, id: userId } = req.user!;

      if (!propertyId) {
        res.status(400).json({ error: "Property ID is required" });
        return;
      }

      // Check if property exists
      const existing = organizationId
        ? await db.select().from(propertiesTable).where(
            and(
              eq(propertiesTable.id, propertyId),
              eq(propertiesTable.organizationId, organizationId)
            )
          ).limit(1)
        : await db.select().from(propertiesTable).where(eq(propertiesTable.id, propertyId)).limit(1);

      if (existing.length === 0) {
        res.status(404).json({ error: "Property not found" });
        return;
      }

      // Check if property has units
      const unitsCount = await db
        .select()
        .from(unitsTable)
        .where(eq(unitsTable.propertyId, propertyId))
        .limit(1);

      if (unitsCount.length > 0) {
        res.status(409).json({
          error: "Cannot delete property with existing units. Delete units first."
        });
        return;
      }

      // Soft delete
      const now = new Date().toISOString();
      await db
        .update(propertiesTable)
        .set({
          updatedAt: now
        })
        .where(eq(propertiesTable.id, propertyId));

      logger.info({ propertyId, userId }, "[DELETE /properties/:id] deleted");
      res.json({ success: true, message: "Property deleted" });
    } catch (err) {
      logger.error({ err }, "[DELETE /properties/:id] failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;