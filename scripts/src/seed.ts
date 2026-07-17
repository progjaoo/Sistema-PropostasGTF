import bcrypt from "bcryptjs";
import { prisma } from "@workspace/db";

const RECALL_TEST_MILESTONES = [3, 6, 10] as const;

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  const originalDay = next.getDate();
  next.setMonth(next.getMonth() + months);

  if (next.getDate() !== originalDay) {
    next.setDate(0);
  }

  return next;
}

function monthsAgo(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

async function seed() {
  console.log("Seeding database...");

  let station =
    (await prisma.station.findFirst({ orderBy: { createdAt: "asc" } })) ??
    (await prisma.station.create({
      data: {
        name: "Radio 88 FM",
        slogan: "A mais ouvida da cidade",
        primaryColor: "#427EFF",
        tradeName: "Radio 88 FM",
        legalName: "Radio 88 FM Comunicacao Ltda",
        cnpj: "00.000.000/0001-88",
        contactPhone: "(11) 3000-8888",
        contactEmail: "comercial@radio88fm.com.br",
      },
    }));
  station = await prisma.station.update({
    where: { id: station.id },
    data: { primaryColor: "#427EFF" },
  });
  const stationId = station.id;
  console.log("Station OK:", stationId);

  const passwordHash = await bcrypt.hash("Admin@123", 12);
  await prisma.user.upsert({
    where: { email: "admin@radio88fm.com.br" },
    update: {
      name: "Administrador",
      passwordHash,
      role: "ADMIN",
      active: true,
      jobTitle: "Administrador Comercial",
      contactPhone: "(11) 3000-8888",
      contactEmail: "admin@radio88fm.com.br",
    },
    create: {
      name: "Administrador",
      email: "admin@radio88fm.com.br",
      passwordHash,
      role: "ADMIN",
      active: true,
      jobTitle: "Administrador Comercial",
      contactPhone: "(11) 3000-8888",
      contactEmail: "admin@radio88fm.com.br",
    },
  });

  const comercialHash = await bcrypt.hash("Comercial@123", 12);
  const commercialUser = await prisma.user.upsert({
    where: { email: "carlos@radio88fm.com.br" },
    update: {
      name: "Carlos Silva",
      passwordHash: comercialHash,
      role: "COMERCIAL",
      active: true,
      jobTitle: "Executivo de Contas",
      contactPhone: "(11) 98765-0001",
      contactEmail: "carlos@radio88fm.com.br",
    },
    create: {
      name: "Carlos Silva",
      email: "carlos@radio88fm.com.br",
      passwordHash: comercialHash,
      role: "COMERCIAL",
      active: true,
      jobTitle: "Executivo de Contas",
      contactPhone: "(11) 98765-0001",
      contactEmail: "carlos@radio88fm.com.br",
    },
  });
  const [activeCommercialUsers, activeStations] = await Promise.all([
    prisma.user.findMany({
      where: { role: "COMERCIAL", active: true, stationAccesses: { none: {} } },
      select: { id: true },
    }),
    prisma.station.findMany({ where: { active: true }, select: { id: true } }),
  ]);
  await prisma.userStationAccess.createMany({
    data: activeCommercialUsers.flatMap((user) =>
      activeStations.map((activeStation) => ({
        userId: user.id,
        stationId: activeStation.id,
        canCreateProposals: true,
        canViewCatalog: true,
        active: true,
      })),
    ),
    skipDuplicates: true,
  });
  console.log("Users OK");

  await prisma.advertiser.upsert({
    where: { cnpj: "12.345.678/0001-90" },
    update: {
      tradeName: "Supermercado Bom Preco",
      legalName: "Comercio Alimentar Ltda",
      contactName: "Maria Oliveira",
      contactPhone: "(11) 98765-4321",
      contactEmail: "maria@bompreco.com.br",
      status: "CLIENT",
      active: true,
    },
    create: {
      tradeName: "Supermercado Bom Preco",
      legalName: "Comercio Alimentar Ltda",
      cnpj: "12.345.678/0001-90",
      contactName: "Maria Oliveira",
      contactPhone: "(11) 98765-4321",
      contactEmail: "maria@bompreco.com.br",
      status: "CLIENT",
      active: true,
    },
  });
  console.log("Advertiser OK");

  const proposalTypes = ["Proposta Comercial", "Proposta Institucional", "Pacote Promocional"];
  const proposalTypeIds: Record<string, string> = {};
  for (const name of proposalTypes) {
    const type = await prisma.proposalType.upsert({
      where: { name },
      update: { active: true },
      create: { name, active: true },
    });
    proposalTypeIds[name] = type.id;
  }
  console.log("Proposal types OK");

  const categories = [
    { name: "Jornal da Manha", slug: "jornal-da-manha", description: "Programa matinal com jornalismo, servico e entrevistas", icon: null, order: 0 },
    { name: "Show da Manha", slug: "show-da-manha", description: "Entretenimento e alta audiencia no periodo da manha", icon: null, order: 1 },
    { name: "Rotativo Comercial", slug: "rotativo-comercial", description: "Insercoes comerciais distribuidas na grade", icon: null, order: 2 },
    { name: "Digital 88 FM", slug: "digital-88-fm", description: "Lives, redes sociais e entregas digitais", icon: null, order: 3 },
  ];

  const catIds: Record<string, string> = {};
  for (const cat of categories) {
    const saved = await prisma.proposalCategory.upsert({
      where: { slug: cat.slug },
      update: { ...cat, stationId },
      create: { ...cat, stationId },
    });
    catIds[cat.slug] = saved.id;
  }
  console.log("Programs OK:", Object.keys(catIds));

  const durationDefs = [
    { label: "4s", seconds: 4, order: 0 },
    { label: "10s", seconds: 10, order: 1 },
    { label: "15s", seconds: 15, order: 2 },
    { label: "30s", seconds: 30, order: 3 },
    { label: "60s", seconds: 60, order: 4 },
    { label: "120s", seconds: 120, order: 5 },
  ];
  const durationIds: Record<string, string> = {};
  for (const duration of durationDefs) {
    const saved = await prisma.productDuration.upsert({
      where: { label: duration.label },
      update: { ...duration, active: true },
      create: { ...duration, active: true },
    });
    durationIds[duration.label] = saved.id;
  }
  console.log("Product durations OK:", Object.keys(durationIds));

  const productDefs = [
    {
      name: "Spot 30s",
      programId: catIds["rotativo-comercial"],
      durationId: durationIds["30s"],
      qty: "08",
      title: "SPOT 30 SEGUNDOS",
      description: "Insercoes diarias em horario nobre",
      detail: "Producao incluida",
      program: "Programacao Geral",
      suggestedValueMin: "R$ 1.500,00",
      suggestedValueMax: null,
      tags: ["spot", "30s", "nobre"],
      color: "BLUE" as const,
    },
    {
      name: "Patrocinio de Quadro",
      programId: catIds["show-da-manha"],
      durationId: null,
      qty: "01",
      title: "PATROCINIO DE QUADRO",
      description: "Quadro exclusivo com mensagem do patrocinador",
      detail: "Alta visibilidade e associacao de marca",
      program: "Programa da Manha",
      suggestedValueMin: "R$ 3.000,00",
      suggestedValueMax: null,
      tags: ["patrocinio", "quadro", "manha"],
      color: "GREEN" as const,
    },
    {
      name: "Live Commerce",
      programId: catIds["digital-88-fm"],
      durationId: durationIds["120s"],
      qty: "02",
      title: "LIVE COMMERCE",
      description: "Transmissao ao vivo com participacao do anunciante",
      detail: "Ate 2h de duracao, divulgacao nas redes sociais",
      program: "Digital + On Air",
      suggestedValueMin: "R$ 2.000,00",
      suggestedValueMax: null,
      tags: ["live", "digital", "commerce"],
      color: "YELLOW" as const,
    },
    {
      name: "Vinheta de Intervalo",
      programId: catIds["rotativo-comercial"],
      durationId: durationIds["10s"],
      qty: "12",
      title: "VINHETA DE INTERVALO",
      description: "Vinheta de 10 segundos nos intervalos comerciais",
      detail: "Rotatividade garantida",
      program: "Todos os programas",
      suggestedValueMin: "R$ 800,00",
      suggestedValueMax: null,
      tags: ["vinheta", "10s", "intervalo"],
      color: "RED" as const,
    },
  ];

  for (let i = 0; i < productDefs.length; i++) {
    const product = productDefs[i]!;
    await prisma.productTemplate.upsert({
      where: { stationId_name: { stationId, name: product.name } },
      update: { ...product, order: i, active: true },
      create: { ...product, stationId, order: i, active: true },
    });
  }
  console.log("Product templates OK");

  const templates = [
    {
      categoryId: catIds["rotativo-comercial"],
      name: "Campanha Varejo Premium",
      description: "Pacote completo para varejo com spot, patrocinio e vinhetas",
      propType: "Proposta Comercial",
      campTag: "CAMPANHA VAREJO",
      periodDesc: "30 dias corridos",
      investDesc: "Investimento unico com desconto progressivo a partir de 3 meses",
      stats: [
        { num: "350", suf: "mil", desc: "ouvintes/dia" },
        { num: "98", suf: "%", desc: "cobertura regional" },
        { num: "47", suf: "anos", desc: "de historia" },
        { num: "N1", suf: "", desc: "audiencia local" },
      ],
      overlayOpacity: 70,
      products: [
        {
          order: 0,
          qty: "08",
          title: "SPOT 30 SEGUNDOS",
          description: "Insercoes diarias em horario nobre (06h-19h)",
          detail: "Producao incluida sem custo adicional",
          program: "Programacao Geral",
          tags: ["spot", "30s"],
          color: "BLUE" as const,
        },
        {
          order: 1,
          qty: "01",
          title: "PATROCINIO DE QUADRO",
          description: "Patrocinio exclusivo do Quadro de Ofertas",
          detail: "Participacao ao vivo com o apresentador",
          program: "Show da Manha",
          tags: ["patrocinio", "ao vivo"],
          color: "GREEN" as const,
        },
        {
          order: 2,
          qty: "12",
          title: "VINHETAS DE INTERVALO",
          description: "Vinhetas de 10 segundos em todos os intervalos",
          detail: "Alta frequencia de exposicao",
          program: "Todos os programas",
          tags: ["vinheta", "frequencia"],
          color: "YELLOW" as const,
        },
      ],
    },
    {
      categoryId: catIds["digital-88-fm"],
      name: "Campanha Gastronomia Local",
      description: "Pacote para restaurantes e servicos de alimentacao",
      propType: "Proposta Comercial",
      campTag: "GASTRONOMIA 88",
      periodDesc: "15 a 30 dias",
      investDesc: "Flexivel conforme periodo de veiculacao",
      stats: [
        { num: "350", suf: "mil", desc: "ouvintes/dia" },
        { num: "68", suf: "%", desc: "decisores de compra" },
        { num: "2x", suf: "", desc: "mais impacto com audio" },
        { num: "Top3", suf: "", desc: "no ranking regional" },
      ],
      overlayOpacity: 65,
      products: [
        {
          order: 0,
          qty: "06",
          title: "SPOT 30S HORARIO ALMOCO",
          description: "Spots nos horarios de almoco e jantar (11h-14h e 18h-20h)",
          detail: "Producao com trilha sonora incluida",
          program: "Programacao Geral",
          tags: ["spot", "almoco"],
          color: "BLUE" as const,
        },
        {
          order: 1,
          qty: "02",
          title: "LIVE COMMERCE",
          description: "Lives nas redes sociais com participacao do restaurante",
          detail: "Producao e operacao pela equipe digital da radio",
          program: "Digital 88 FM",
          tags: ["live", "digital", "redes"],
          color: "RED" as const,
        },
      ],
    },
  ];

  for (const template of templates) {
    if (!template.categoryId) continue;
    const { products, ...data } = template;
    const saved = await prisma.proposalTemplate.upsert({
      where: { stationId_name: { stationId, name: data.name } },
      update: { ...data, stationId, active: true },
      create: { ...data, stationId, active: true },
    });
    await prisma.proposalTemplateProduct.deleteMany({
      where: { templateId: saved.id },
    });
    await prisma.proposalTemplateProduct.createMany({
      data: products.map((product) => ({
        ...product,
        templateId: saved.id,
      })),
    });
    console.log(`${data.name} OK`);
  }

  const fallbackProduct = await prisma.productTemplate.findFirst({
    where: { stationId, active: true },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    include: {
      duration: { select: { label: true } },
      programRef: { select: { name: true } },
    },
  });

  const recallTestScenarios = [
    {
      tradeName: "Lead Recaptura 3 Meses",
      cnpj: "98.000.000/0001-03",
      contactName: "Contato Recaptura 3",
      contactPhone: "(11) 90000-0003",
      contactEmail: "recaptura3@teste.local",
      rejectedMonthsAgo: 4,
      investValue: "R$ 3.000,00",
    },
    {
      tradeName: "Lead Recaptura 6 Meses",
      cnpj: "98.000.000/0001-06",
      contactName: "Contato Recaptura 6",
      contactPhone: "(11) 90000-0006",
      contactEmail: "recaptura6@teste.local",
      rejectedMonthsAgo: 7,
      investValue: "R$ 6.000,00",
    },
    {
      tradeName: "Lead Recaptura 10 Meses",
      cnpj: "98.000.000/0001-10",
      contactName: "Contato Recaptura 10",
      contactPhone: "(11) 90000-0010",
      contactEmail: "recaptura10@teste.local",
      rejectedMonthsAgo: 11,
      investValue: "R$ 10.000,00",
    },
  ];

  let recallReminderCount = 0;
  for (const scenario of recallTestScenarios) {
    const rejectedAt = monthsAgo(scenario.rejectedMonthsAgo);
    const advertiser = await prisma.advertiser.upsert({
      where: { cnpj: scenario.cnpj },
      update: {
        tradeName: scenario.tradeName,
        legalName: null,
        contactName: scenario.contactName,
        contactPhone: scenario.contactPhone,
        contactEmail: scenario.contactEmail,
        notes: "Lead local para teste de avisos de recaptura.",
        status: "LEAD",
        active: true,
      },
      create: {
        tradeName: scenario.tradeName,
        legalName: null,
        cnpj: scenario.cnpj,
        contactName: scenario.contactName,
        contactPhone: scenario.contactPhone,
        contactEmail: scenario.contactEmail,
        notes: "Lead local para teste de avisos de recaptura.",
        status: "LEAD",
        active: true,
      },
    });

    const proposalData = {
      stationId,
      advertiserId: advertiser.id,
      createdById: commercialUser.id,
      status: "REJECTED" as const,
      proposalTypeId: proposalTypeIds["Pacote Promocional"],
      periodicity: "MONTHLY" as const,
      propType: "Pacote Promocional",
      propMonth: String(rejectedAt.getMonth() + 1).padStart(2, "0"),
      propYear: String(rejectedAt.getFullYear()),
      campTag: "TESTE DE RECAPTURA",
      clientLine1: scenario.tradeName,
      clientLine2: "Lead rejeitado para teste de recaptura",
      periodDesc: "Mensal",
      showPeriod: true,
      overlayOpacity: 70,
      stats: [],
      investDesc: "Proposta rejeitada usada para validar recaptura.",
      investValue: scenario.investValue,
      contactName: commercialUser.name,
      contactRole: commercialUser.jobTitle,
      contactPhone: commercialUser.contactPhone,
      createdAt: rejectedAt,
    };

    const existingProposal = await prisma.proposal.findFirst({
      where: {
        stationId,
        advertiserId: advertiser.id,
        createdById: commercialUser.id,
        campTag: "TESTE DE RECAPTURA",
      },
      select: { id: true },
    });

    const proposal = existingProposal
      ? await prisma.proposal.update({
          where: { id: existingProposal.id },
          data: proposalData,
        })
      : await prisma.proposal.create({
          data: proposalData,
        });

    await prisma.proposalProduct.deleteMany({ where: { proposalId: proposal.id } });
    await prisma.proposalProduct.create({
      data: {
        proposalId: proposal.id,
        productTemplateId: fallbackProduct?.id ?? null,
        order: 0,
        qty: "01",
        title: fallbackProduct?.title ?? "PRODUTO TESTE RECAPTURA",
        description: fallbackProduct?.description ?? "Produto de teste para validar aviso de recaptura.",
        detail: fallbackProduct?.detail ?? null,
        program: fallbackProduct?.programRef?.name ?? fallbackProduct?.program ?? "Programa de teste",
        durationLabel: fallbackProduct?.duration?.label ?? null,
        airTime: "09h as 12h",
        seasonality: "MONTHLY",
        tags: [],
        color: "BLUE",
      },
    });

    await prisma.proposalTimeline.deleteMany({
      where: {
        proposalId: proposal.id,
        step: "REJECTED",
        note: "Proposta rejeitada para teste de recaptura.",
      },
    });
    await prisma.proposalTimeline.create({
      data: {
        proposalId: proposal.id,
        step: "REJECTED",
        note: "Proposta rejeitada para teste de recaptura.",
        createdById: commercialUser.id,
        createdAt: rejectedAt,
      },
    });

    for (const milestoneMonths of RECALL_TEST_MILESTONES) {
      await prisma.proposalRecallReminder.upsert({
        where: {
          proposalId_milestoneMonths: {
            proposalId: proposal.id,
            milestoneMonths,
          },
        },
        update: {
          advertiserId: advertiser.id,
          assignedToId: commercialUser.id,
          rejectedAt,
          dueAt: addMonths(rejectedAt, milestoneMonths),
          snoozedUntil: null,
          status: "PENDING",
          lastNotifiedAt: null,
          handledAt: null,
          handledById: null,
          note: null,
        },
        create: {
          proposalId: proposal.id,
          advertiserId: advertiser.id,
          assignedToId: commercialUser.id,
          milestoneMonths,
          rejectedAt,
          dueAt: addMonths(rejectedAt, milestoneMonths),
          status: "PENDING",
        },
      });
      recallReminderCount += 1;
    }
  }
  console.log(`Recall reminder test data OK: ${recallTestScenarios.length} leads, ${recallReminderCount} reminders`);

  console.log("\nSeed completed successfully!");
  console.log("Admin login: admin@radio88fm.com.br / Admin@123");
  console.log("Comercial login: carlos@radio88fm.com.br / Comercial@123");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
