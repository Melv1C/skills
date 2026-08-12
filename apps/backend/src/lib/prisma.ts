import { Prisma, PrismaClient } from "@generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { DefaultArgs } from "@prisma/client/runtime/client";
import { ENV } from "varlock/env";

import { logger } from "@/lib/logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient<"query", Prisma.GlobalOmitConfig | undefined, DefaultArgs> | undefined;
  prismaWithoutLog: PrismaClient | undefined;
};

const adapter = new PrismaPg({
  connectionString: ENV.DATABASE_URL,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: [
      {
        emit: "event",
        level: "query",
      },
    ],
  });

prisma.$on("query", (e) => {
  logger.info("Prisma Query", {
    metadata: {
      query: e.query,
      params: e.params,
      duration: e.duration,
    },
  });
});

export const prismaWithoutLog =
  globalForPrisma.prismaWithoutLog ??
  new PrismaClient({
    adapter,
  });

if (ENV.APP_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaWithoutLog = prismaWithoutLog;
}

export type { Prisma };
