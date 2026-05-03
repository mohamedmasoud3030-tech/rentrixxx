import { db } from "@workspace/db";
import { governanceTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export class LockedPeriodError extends Error {
  constructor(period: string) {
    super(`Mutation rejected: period "${period}" is locked.`);
    this.name = "LockedPeriodError";
  }
}

export class ReadOnlyModeError extends Error {
  constructor() {
    super("Mutation rejected: system is in read-only mode.");
    this.name = "ReadOnlyModeError";
  }
}

function getYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function assertPeriodUnlocked(
  transactionDate: Date = new Date(),
): Promise<void> {
  let governance: (typeof governanceTable.$inferSelect) | undefined;

  try {
    const rows = await db
      .select()
      .from(governanceTable)
      .where(eq(governanceTable.id, 1))
      .limit(1);

    governance = rows[0];
  } catch (err) {
    logger.error({ err }, "[governance] Failed to query governance table");
    throw err;
  }

  if (!governance) {
    return;
  }

  if (governance.readOnly) {
    throw new ReadOnlyModeError();
  }

  const period = getYearMonth(transactionDate);
  if (governance.lockedPeriods && governance.lockedPeriods.includes(period)) {
    throw new LockedPeriodError(period);
  }
}
