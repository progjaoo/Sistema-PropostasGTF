import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env["NODE_ENV"] === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}

export type {
  Advertiser,
  Prisma,
  ProductTemplate,
  Proposal,
  ProposalCategory,
  ProposalProduct,
  ProposalTemplate,
  ProposalTemplateProduct,
  ProposalVersion,
  RefreshToken,
  Station,
  User,
} from "@prisma/client";
export { ProductColor, ProposalStatus, UserRole } from "@prisma/client";
