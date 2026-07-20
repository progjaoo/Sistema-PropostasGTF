import bcrypt from "bcryptjs";
import { prisma, type Prisma } from "@workspace/db";
import { assertTestDatabaseUrl } from "./test-app";

const DEFAULT_PASSWORD = "Admin@123";

function unique(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export async function resetTestDatabase(): Promise<void> {
  assertTestDatabaseUrl(process.env.DATABASE_URL);
  await prisma.$transaction([
    prisma.proposalRecallReminder.deleteMany(),
    prisma.proposalTimeline.deleteMany(),
    prisma.proposalVersion.deleteMany(),
    prisma.proposalProduct.deleteMany(),
    prisma.proposal.deleteMany(),
    prisma.proposalTemplateProduct.deleteMany(),
    prisma.proposalTemplate.deleteMany(),
    prisma.productTemplate.deleteMany(),
    prisma.productDuration.deleteMany(),
    prisma.proposalCategory.deleteMany(),
    prisma.proposalType.deleteMany(),
    prisma.stationPresentationItem.deleteMany(),
    prisma.userStationAccess.deleteMany(),
    prisma.securityRateLimit.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.advertiser.deleteMany(),
    prisma.station.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

export async function createUser(
  overrides: Partial<Prisma.UserUncheckedCreateInput> = {},
) {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 4);
  const id = unique("user");
  return prisma.user.create({
    data: {
      id,
      name: `User ${id.slice(-8)}`,
      email: `${id}@example.test`,
      passwordHash,
      role: "COMERCIAL",
      active: true,
      ...overrides,
    },
  });
}

export function createAdmin(
  overrides: Partial<Prisma.UserUncheckedCreateInput> = {},
) {
  return createUser({ role: "ADMIN", ...overrides });
}

export function createCommercial(
  overrides: Partial<Prisma.UserUncheckedCreateInput> = {},
) {
  return createUser({ role: "COMERCIAL", ...overrides });
}

export function createStation(
  overrides: Partial<Prisma.StationUncheckedCreateInput> = {},
) {
  const id = unique("station");
  return prisma.station.create({
    data: {
      id,
      name: `Station ${id.slice(-8)}`,
      ...overrides,
    },
  });
}

export async function grantStationAccess(input: {
  userId: string;
  stationId: string;
  canCreateProposals?: boolean;
  canViewCatalog?: boolean;
  active?: boolean;
}) {
  return prisma.userStationAccess.create({
    data: {
      userId: input.userId,
      stationId: input.stationId,
      canCreateProposals: input.canCreateProposals ?? true,
      canViewCatalog: input.canViewCatalog ?? true,
      active: input.active ?? true,
    },
  });
}

export async function createProposal(input: {
  createdById: string;
  stationId: string;
  advertiserId?: string | null;
  overrides?: Partial<Prisma.ProposalUncheckedCreateInput>;
}) {
  const id = unique("proposal");
  return prisma.proposal.create({
    data: {
      id,
      createdById: input.createdById,
      stationId: input.stationId,
      advertiserId: input.advertiserId ?? null,
      propType: "Proposta Comercial",
      propMonth: "Julho",
      propYear: "2026",
      status: "DRAFT",
      ...input.overrides,
    },
  });
}

export function createAdvertiser(
  overrides: Partial<Prisma.AdvertiserUncheckedCreateInput> = {},
) {
  const id = unique("advertiser");
  return prisma.advertiser.create({
    data: {
      id,
      tradeName: `Advertiser ${id.slice(-8)}`,
      status: "LEAD",
      ...overrides,
    },
  });
}

export const testPassword = DEFAULT_PASSWORD;
