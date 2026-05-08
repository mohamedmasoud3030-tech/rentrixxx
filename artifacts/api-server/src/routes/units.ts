import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { unitsTable } from "@workspace/db/schema";
import { requireRole } from "../middlewares/auth";
import { MULTI_TENANT_STRICT } from "../lib/tenancy";
import { logger } from "../lib/logger";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// Validation schemas
const createUnitSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().min(1),
  type: z.string().min(1),
  floor: z.string().optional(),
  status: z.enum(["VACANT", "OCCUPIED", "MAINTENANCE", "RESERVED"]).optional(),
  rentDefault: z.number().nonnegative().optional(),
  minRent: z.number().nonnegative().optional(),
  area: z.string().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  kitchens: z.number().int().nonnegative().optional(),
  livingRooms: z.number().int().nonnegative().optional(),
  waterMeter: z.string().optional(),
  electricityMeter: z.string().optional(),
  features: z.string().optional(),
  notes: z.string().optional(),
});

const updateUnitSchema = z.object({
  propertyId: z.string().uuid().optional(),
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  floor: z.string().optional(),
  status: z.enum(["VACANT", "OCCUPIED", "MAINTENANCE", "RESERVED"]).optional(),
  rentDefault: z.number().nonnegative().optional(),
  minRent: z.number().nonnegative().optional(),
  area: z.string().optional(),
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  kitchens: z.number().int().nonnegative().optional(),
  livingRooms: z.number().int().nonnegative().optional(),
  waterMeter: z.string().optional(),
  electricityMeter: z.string().optional(),
  features: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * GET /units
 * List all units for the organization
 */
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

/**
 * GET /units/:id
 * Get a single unit by ID
 */
router.get(
  "/units/:id",
  requireRole("USER"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const unitId = req.params['id'] as string;
      const { organizationId } = req.user!;

      if (!unitId) {
        res.status(400).json({ error: "Unit ID is required" });
        return;
      }

      const query = organizationId
        ? and(
            eq(unitsTable.id, unitId),
            eq(unitsTable.organizationId, organizationId)
          )
        : eq(unitsTable.id, unitId);

      const [row] = await db.select().from(unitsTable).where(query).limit(1);

      if (!row) {
        res.status(404).json({ error: "Unit not found" });
        return;
      }

      res.json({ data: row });
    } catch (err) {
      logger.error({ err }, "[GET /units/:id] query failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * POST /units
 * Create a new unit
 */
router.post(
  "/units",
  requireRole("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { organizationId, id: userId } = req.user!;

      if (!organizationId && MULTI_TENANT_STRICT) {
        res.status(403).json({ error: "Organization context required" });
        return;
      }

      // Validate input
      const parseResult = createUnitSchema.safeParse(req.body);
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

      const [newUnit] = await db.insert(unitsTable).values({
        id,
        propertyId: body.propertyId,
        name: body.name,
        type: body.type,
        floor: body.floor ?? null,
        status: body.status ?? "VACANT",
        rentDefault: (body.rentDefault ?? 0).toString(),
        minRent: body.minRent?.toString() ?? null,
        area: body.area ?? null,
        bedrooms: body.bedrooms ?? null,
        bathrooms: body.bathrooms ?? null,
        kitchens: body.kitchens ?? null,
        livingRooms: body.livingRooms ?? null,
        waterMeter: body.waterMeter ?? null,
        electricityMeter: body.electricityMeter ?? null,
        features: body.features ?? null,
        notes: body.notes ?? "",
        organizationId: organizationId ?? null,
        createdAt: now,
        updatedAt: now,
      }).returning();

      logger.info({ unitId: id, userId }, "[POST /units] created");
      res.status(201).json({ data: newUnit });
    } catch (err) {
      logger.error({ err }, "[POST /units] failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * PATCH /units/:id
 * Update an existing unit
 */
router.patch(
  "/units/:id",
  requireRole("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const unitId = req.params['id'] as string;
      const { organizationId, id: userId } = req.user!;

      if (!unitId) {
        res.status(400).json({ error: "Unit ID is required" });
        return;
      }

      // Validate input
      const parseResult = updateUnitSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.issues
        });
        return;
      }

      const body = parseResult.data;

      // Check if unit exists
      const query = organizationId
        ? and(
            eq(unitsTable.id, unitId),
            eq(unitsTable.organizationId, organizationId)
          )
        : eq(unitsTable.id, unitId);

      const [existing] = await db.select().from(unitsTable).where(query).limit(1);

      if (!existing) {
        res.status(404).json({ error: "Unit not found" });
        return;
      }

      // Build update object
      const updates: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };

      if (body.propertyId !== undefined) updates.propertyId = body.propertyId;
      if (body.name !== undefined) updates.name = body.name;
      if (body.type !== undefined) updates.type = body.type;
      if (body.floor !== undefined) updates.floor = body.floor;
      if (body.status !== undefined) updates.status = body.status;
      if (body.rentDefault !== undefined) updates.rentDefault = body.rentDefault.toString();
      if (body.minRent !== undefined) updates.minRent = body.minRent?.toString();
      if (body.area !== undefined) updates.area = body.area;
      if (body.bedrooms !== undefined) updates.bedrooms = body.bedrooms;
      if (body.bathrooms !== undefined) updates.bathrooms = body.bathrooms;
      if (body.kitchens !== undefined) updates.kitchens = body.kitchens;
      if (body.livingRooms !== undefined) updates.livingRooms = body.livingRooms;
      if (body.waterMeter !== undefined) updates.waterMeter = body.waterMeter;
      if (body.electricityMeter !== undefined) updates.electricityMeter = body.electricityMeter;
      if (body.features !== undefined) updates.features = body.features;
      if (body.notes !== undefined) updates.notes = body.notes;

      const [updated] = await db
        .update(unitsTable)
        .set(updates)
        .where(eq(unitsTable.id, unitId))
        .returning();

      logger.info({ unitId, userId }, "[PATCH /units/:id] updated");
      res.json({ data: updated });
    } catch (err) {
      logger.error({ err }, "[PATCH /units/:id] failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

/**
 * DELETE /units/:id
 * Delete a unit (only if not occupied)
 */
router.delete(
  "/units/:id",
  requireRole("ADMIN"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const unitId = req.params['id'] as string;
      const { organizationId, id: userId } = req.user!;

      if (!unitId) {
        res.status(400).json({ error: "Unit ID is required" });
        return;
      }

      // Check if unit exists
      const query = organizationId
        ? and(
            eq(unitsTable.id, unitId),
            eq(unitsTable.organizationId, organizationId)
          )
        : eq(unitsTable.id, unitId);

      const [existing] = await db.select().from(unitsTable).where(query).limit(1);

      if (!existing) {
        res.status(404).json({ error: "Unit not found" });
        return;
      }

      // Prevent deletion of occupied units
      if (existing.status === "OCCUPIED") {
        res.status(409).json({
          error: "Cannot delete an occupied unit. End the contract first."
        });
        return;
      }

      // Hard delete
      await db.delete(unitsTable).where(eq(unitsTable.id, unitId));

      logger.info({ unitId, userId }, "[DELETE /units/:id] deleted");
      res.json({ success: true, message: "Unit deleted" });
    } catch (err) {
      logger.error({ err }, "[DELETE /units/:id] failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;