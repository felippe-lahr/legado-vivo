import { PrismaClient } from "@prisma/client";

// Reaproveita a instância em desenvolvimento (evita esgotar conexões com o
// hot-reload do Next.js). Em produção, uma única instância por processo.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
