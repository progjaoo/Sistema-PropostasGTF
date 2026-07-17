import { type Prisma, prisma } from "@workspace/db";

export type PresentationItemInput = {
  highlight: string;
  description: string;
  order?: number;
};

export function normalizePresentationItems(items: unknown): PresentationItemInput[] {
  if (!Array.isArray(items)) return [];

  return items
    .slice(0, 4)
    .map((item: any, index) => ({
      highlight: String(item?.highlight ?? item?.num ?? item?.value ?? "").trim(),
      description: String(item?.description ?? item?.desc ?? "").trim(),
      order: Number.isInteger(item?.order) ? item.order : index,
    }))
    .filter((item) => item.highlight || item.description)
    .map((item, index) => ({
      highlight: item.highlight,
      description: item.description,
      order: index,
    }));
}

export function stationPresentationToStats(
  items: Array<{ highlight: string; description: string; order: number; active: boolean }>,
) {
  return items
    .filter((item) => item.active)
    .sort((a, b) => a.order - b.order)
    .slice(0, 4)
    .map((item) => ({
      num: item.highlight,
      suf: "",
      desc: item.description,
    }));
}

type PresentationClient = Prisma.TransactionClient | typeof prisma;

export async function getStationPresentationStats(client: PresentationClient, stationId: string) {
  const items = await client.stationPresentationItem.findMany({
    where: { stationId, active: true },
    orderBy: { order: "asc" },
  });
  return stationPresentationToStats(items);
}

export async function replaceStationPresentationItems(
  tx: Prisma.TransactionClient,
  stationId: string,
  items: PresentationItemInput[],
) {
  const normalized = normalizePresentationItems(items);
  await tx.stationPresentationItem.deleteMany({ where: { stationId } });
  if (normalized.length === 0) return;

  await tx.stationPresentationItem.createMany({
    data: normalized.map((item, index) => ({
      stationId,
      highlight: item.highlight,
      description: item.description,
      order: index,
      active: true,
    })),
  });
}
