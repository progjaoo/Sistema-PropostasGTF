import { prisma } from "@workspace/db";

export type StationPermission = "canCreateProposals" | "canViewCatalog";

export class StationAccessError extends Error {
  readonly statusCode = 403;

  constructor(message = "Você não possui acesso a esta empresa") {
    super(message);
    this.name = "StationAccessError";
  }
}

export async function getAccessibleStationIds(
  userId: string,
  role: string | undefined,
  permission?: StationPermission,
): Promise<string[] | null> {
  if (role === "ADMIN") return null;

  const accesses = await prisma.userStationAccess.findMany({
    where: {
      userId,
      active: true,
      station: { active: true },
      ...(permission
        ? { [permission]: true }
        : { OR: [{ canCreateProposals: true }, { canViewCatalog: true }] }),
    },
    select: { stationId: true },
  });

  return accesses.map((access) => access.stationId);
}

export async function assertStationPermission(
  userId: string,
  role: string | undefined,
  stationId: string,
  permission: StationPermission,
): Promise<void> {
  if (role === "ADMIN") return;

  const access = await prisma.userStationAccess.findFirst({
    where: {
      userId,
      stationId,
      active: true,
      [permission]: true,
      station: { active: true },
    },
    select: { id: true },
  });

  if (!access) throw new StationAccessError();
}

export function respondToStationAccessError(error: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }): boolean {
  if (!(error instanceof StationAccessError)) return false;
  res.status(error.statusCode).json({ error: error.message });
  return true;
}
