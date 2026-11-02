import { Prisma } from "@prisma/client";
import type { PrismaService } from "./prisma.service";
import { isPrismaErrorCode } from "./prisma-errors";

/** Retry only database serialization conflicts; callbacks must have no external side effects. */
export async function withSerializableRetry<T>(
  db: PrismaService,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await db.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isPrismaErrorCode(error, "P2034") || attempt >= 2) throw error;
      const delayMs = 20 * 2 ** attempt + Math.floor(Math.random() * 20);
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
