import { Router } from "express";
import { prisma, type Station } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { z } from "zod/v4";
import { getAccessibleStationIds } from "../services/station-access";
import {
  normalizePresentationItems,
  replaceStationPresentationItems,
  stationPresentationToStats,
} from "../services/station-presentation";

const router = Router();

const stationBody = z.object({
  name: z.string().min(1),
  slogan: z.string().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  logoBase64: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  tradeName: z.string().optional().nullable(),
  legalName: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

const presentationBody = z.object({
  items: z.array(z.object({
    highlight: z.string().trim().min(1).max(40),
    description: z.string().trim().min(1).max(140),
    order: z.number().int().min(0).max(3).optional(),
  })).max(4),
});

type ViewerPermissions = {
  canCreateProposals: boolean;
  canViewCatalog: boolean;
};

type StationWithPresentation = Station & {
  presentationItems?: Array<{
    id: string;
    highlight: string;
    description: string;
    order: number;
    active: boolean;
  }>;
};

function formatPresentationItems(items?: StationWithPresentation["presentationItems"]) {
  return (items ?? [])
    .filter((item) => item.active)
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      id: item.id,
      highlight: item.highlight,
      description: item.description,
      order: item.order,
      active: item.active,
    }));
}

function formatStation(s: StationWithPresentation, viewerPermissions?: ViewerPermissions) {
  return {
    id: s.id,
    name: s.name,
    slogan: s.slogan ?? null,
    primaryColor: s.primaryColor ?? "#427EFF",
    logoBase64: s.logoBase64 ?? null,
    cnpj: s.cnpj ?? null,
    tradeName: s.tradeName ?? null,
    legalName: s.legalName ?? null,
    contactName: s.contactName ?? null,
    contactPhone: s.contactPhone ?? null,
    contactEmail: s.contactEmail ?? null,
    address: s.address ?? null,
    city: s.city ?? null,
    state: s.state ?? null,
    website: s.website ?? null,
    notes: s.notes ?? null,
    active: s.active,
    createdAt: s.createdAt.toISOString(),
    presentationItems: formatPresentationItems(s.presentationItems),
    viewerCanCreateProposals: viewerPermissions?.canCreateProposals ?? true,
    viewerCanViewCatalog: viewerPermissions?.canViewCatalog ?? true,
  };
}

router.get("/", requireAuth, async (req, res): Promise<void> => {
  const accessibleIds = await getAccessibleStationIds(req.userId!, req.userRole);
  const stations = await prisma.station.findMany({
    where: accessibleIds === null ? {} : { id: { in: accessibleIds } },
    orderBy: { createdAt: "asc" },
    include: {
      presentationItems: {
        where: { active: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (accessibleIds === null) {
    res.json(stations.map((station) => formatStation(station)));
    return;
  }

  const accesses = await prisma.userStationAccess.findMany({
    where: {
      userId: req.userId!,
      stationId: { in: accessibleIds },
      active: true,
    },
    select: {
      stationId: true,
      canCreateProposals: true,
      canViewCatalog: true,
    },
  });
  const permissionsByStation = new Map(
    accesses.map((access) => [
      access.stationId,
      {
        canCreateProposals: access.canCreateProposals,
        canViewCatalog: access.canViewCatalog,
      },
    ]),
  );

  res.json(stations.map((station) => formatStation(station, permissionsByStation.get(station.id))));
});

router.post("/", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = stationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const station = await prisma.station.create({
    data: {
      ...parsed.data,
      primaryColor: parsed.data.primaryColor.toUpperCase(),
    },
  });
  res.status(201).json(formatStation(station));
});

router.patch("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = stationBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const station = await prisma.station.update({
      where: { id: String(req.params["id"]) },
      data: {
        ...parsed.data,
        ...(parsed.data.primaryColor ? { primaryColor: parsed.data.primaryColor.toUpperCase() } : {}),
      },
    });
    res.json(formatStation(station));
  } catch {
    res.status(404).json({ error: "Company not found" });
  }
});

router.get("/:id/presentation", requireAuth, async (req, res): Promise<void> => {
  const station = await prisma.station.findUnique({
    where: { id: String(req.params["id"]) },
    select: { id: true },
  });
  if (!station) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const items = await prisma.stationPresentationItem.findMany({
    where: { stationId: station.id, active: true },
    orderBy: { order: "asc" },
  });

  res.json({
    stationId: station.id,
    items: formatPresentationItems(items),
    stats: stationPresentationToStats(items),
  });
});

router.put("/:id/presentation", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = presentationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const stationId = String(req.params["id"]);
  const station = await prisma.station.findUnique({ where: { id: stationId }, select: { id: true } });
  if (!station) {
    res.status(404).json({ error: "Company not found" });
    return;
  }

  const normalized = normalizePresentationItems(parsed.data.items);
  await prisma.$transaction((tx) => replaceStationPresentationItems(tx, stationId, normalized));

  const items = await prisma.stationPresentationItem.findMany({
    where: { stationId, active: true },
    orderBy: { order: "asc" },
  });
  res.json({
    stationId,
    items: formatPresentationItems(items),
    stats: stationPresentationToStats(items),
  });
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  try {
    const station = await prisma.station.update({
      where: { id: String(req.params["id"]) },
      data: { active: false },
    });
    res.json(formatStation(station));
  } catch {
    res.status(404).json({ error: "Company not found" });
  }
});

export default router;
