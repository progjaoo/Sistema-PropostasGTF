import bcrypt from "bcryptjs";
import { prisma } from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  const station =
    (await prisma.station.findFirst({ orderBy: { createdAt: "asc" } })) ??
    (await prisma.station.create({
      data: {
        name: "Radio 88 FM",
        slogan: "A mais ouvida da cidade",
        tradeName: "Radio 88 FM",
        legalName: "Radio 88 FM Comunicacao Ltda",
        cnpj: "00.000.000/0001-88",
        contactPhone: "(11) 3000-8888",
        contactEmail: "comercial@radio88fm.com.br",
      },
    }));
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
  await prisma.user.upsert({
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
  console.log("Users OK");

  await prisma.advertiser.upsert({
    where: { cnpj: "12.345.678/0001-90" },
    update: {
      tradeName: "Supermercado Bom Preco",
      legalName: "Comercio Alimentar Ltda",
      contactName: "Maria Oliveira",
      contactPhone: "(11) 98765-4321",
      contactEmail: "maria@bompreco.com.br",
      active: true,
    },
    create: {
      tradeName: "Supermercado Bom Preco",
      legalName: "Comercio Alimentar Ltda",
      cnpj: "12.345.678/0001-90",
      contactName: "Maria Oliveira",
      contactPhone: "(11) 98765-4321",
      contactEmail: "maria@bompreco.com.br",
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
      update: cat,
      create: cat,
    });
    catIds[cat.slug] = saved.id;
  }
  console.log("Programs OK:", Object.keys(catIds));

  const productDefs = [
    {
      name: "Spot 30s",
      programId: catIds["rotativo-comercial"],
      qty: "08",
      title: "SPOT 30 SEGUNDOS",
      description: "Insercoes diarias em horario nobre",
      detail: "Producao incluida",
      program: "Programacao Geral",
      suggestedValueMin: "R$ 1.500,00",
      suggestedValueMax: "R$ 4.000,00",
      tags: ["spot", "30s", "nobre"],
      color: "BLUE" as const,
    },
    {
      name: "Patrocinio de Quadro",
      programId: catIds["show-da-manha"],
      qty: "01",
      title: "PATROCINIO DE QUADRO",
      description: "Quadro exclusivo com mensagem do patrocinador",
      detail: "Alta visibilidade e associacao de marca",
      program: "Programa da Manha",
      suggestedValueMin: "R$ 3.000,00",
      suggestedValueMax: "R$ 8.000,00",
      tags: ["patrocinio", "quadro", "manha"],
      color: "GREEN" as const,
    },
    {
      name: "Live Commerce",
      programId: catIds["digital-88-fm"],
      qty: "02",
      title: "LIVE COMMERCE",
      description: "Transmissao ao vivo com participacao do anunciante",
      detail: "Ate 2h de duracao, divulgacao nas redes sociais",
      program: "Digital + On Air",
      suggestedValueMin: "R$ 2.000,00",
      suggestedValueMax: "R$ 6.000,00",
      tags: ["live", "digital", "commerce"],
      color: "YELLOW" as const,
    },
    {
      name: "Vinheta de Intervalo",
      programId: catIds["rotativo-comercial"],
      qty: "12",
      title: "VINHETA DE INTERVALO",
      description: "Vinheta de 10 segundos nos intervalos comerciais",
      detail: "Rotatividade garantida",
      program: "Todos os programas",
      suggestedValueMin: "R$ 800,00",
      suggestedValueMax: "R$ 2.000,00",
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
