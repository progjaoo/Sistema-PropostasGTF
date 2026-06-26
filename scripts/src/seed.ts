import bcrypt from "bcryptjs";
import {
  db,
  usersTable,
  stationsTable,
  advertisersTable,
  productTemplatesTable,
  proposalCategoriesTable,
  proposalTemplatesTable,
  proposalTemplateProductsTable,
} from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  // Station
  const [station] = await db
    .insert(stationsTable)
    .values({
      name: "Radio 88 FM",
      slogan: "A mais ouvida da cidade",
    })
    .onConflictDoNothing()
    .returning();

  const stationId = station?.id ?? (await db.select().from(stationsTable).limit(1))[0]?.id;
  if (!stationId) throw new Error("Failed to create station");
  console.log("Station OK:", stationId);

  // Admin user
  const passwordHash = await bcrypt.hash("Admin@123", 12);
  await db
    .insert(usersTable)
    .values({
      name: "Administrador",
      email: "admin@radio88fm.com.br",
      passwordHash,
      role: "ADMIN",
      active: true,
    })
    .onConflictDoNothing();

  const comercialHash = await bcrypt.hash("Comercial@123", 12);
  await db
    .insert(usersTable)
    .values({
      name: "Carlos Silva",
      email: "carlos@radio88fm.com.br",
      passwordHash: comercialHash,
      role: "COMERCIAL",
      active: true,
    })
    .onConflictDoNothing();
  console.log("Users OK");

  // Advertiser
  await db
    .insert(advertisersTable)
    .values({
      tradeName: "Supermercado Bom Preco",
      legalName: "Comercio Alimentar Ltda",
      cnpj: "12.345.678/0001-90",
      contactName: "Maria Oliveira",
      contactPhone: "(11) 98765-4321",
      contactEmail: "maria@bompleco.com.br",
      active: true,
    })
    .onConflictDoNothing();
  console.log("Advertiser OK");

  // Product templates
  const productDefs = [
    {
      name: "Spot 30s",
      qty: "08",
      title: "SPOT 30 SEGUNDOS",
      description: "Insercoes diarias em horario nobre",
      detail: "Producao incluida",
      program: "Programacao Geral",
      tags: ["spot", "30s", "nobre"],
      color: "BLUE" as const,
    },
    {
      name: "Patrocinio de Quadro",
      qty: "01",
      title: "PATROCINIO DE QUADRO",
      description: "Quadro exclusivo com mensagem do patrocinador",
      detail: "Alta visibilidade e associacao de marca",
      program: "Programa da Manha",
      tags: ["patrocinio", "quadro", "manha"],
      color: "GREEN" as const,
    },
    {
      name: "Live Commerce",
      qty: "02",
      title: "LIVE COMMERCE",
      description: "Transmissao ao vivo com participacao do anunciante",
      detail: "Ate 2h de duracao, divulgacao nas redes sociais",
      program: "Digital + On Air",
      tags: ["live", "digital", "commerce"],
      color: "YELLOW" as const,
    },
    {
      name: "Vinheta de Intervalo",
      qty: "12",
      title: "VINHETA DE INTERVALO",
      description: "Vinheta de 10 segundos nos intervalos comerciais",
      detail: "Rotatividade garantida",
      program: "Todos os programas",
      tags: ["vinheta", "10s", "intervalo"],
      color: "RED" as const,
    },
  ];

  for (let i = 0; i < productDefs.length; i++) {
    await db
      .insert(productTemplatesTable)
      .values({ ...productDefs[i]!, stationId, order: i })
      .onConflictDoNothing();
  }
  console.log("Product templates OK");

  // Proposal categories
  const categories = [
    { name: "Veicular", slug: "veicular", description: "Propostas para concessionarias e setor automotivo", icon: "🚗", order: 0 },
    { name: "Varejo", slug: "varejo", description: "Comercio em geral e supermercados", icon: "🛒", order: 1 },
    { name: "Saude", slug: "saude", description: "Clinicas, hospitais, farmacias e planos de saude", icon: "🏥", order: 2 },
    { name: "Alimentacao", slug: "alimentacao", description: "Restaurantes, delivery e industria alimenticia", icon: "🍽️", order: 3 },
    { name: "Construcao", slug: "construcao", description: "Construtoras, materiais e servicos de construcao", icon: "🏗️", order: 4 },
    { name: "Servicos", slug: "servicos", description: "Servicos em geral, financeiras e seguradoras", icon: "⚙️", order: 5 },
  ];

  const catIds: Record<string, string> = {};
  for (const cat of categories) {
    const [inserted] = await db
      .insert(proposalCategoriesTable)
      .values(cat)
      .onConflictDoNothing()
      .returning();
    const id = inserted?.id ?? (await db.select().from(proposalCategoriesTable).where(
      (await import("drizzle-orm")).eq(proposalCategoriesTable.slug, cat.slug)
    ))[0]?.id;
    if (id) catIds[cat.slug] = id;
  }
  console.log("Categories OK:", Object.keys(catIds));

  // Proposal templates
  const varejo = catIds["varejo"];
  const alimentacao = catIds["alimentacao"];

  if (varejo) {
    const [t] = await db
      .insert(proposalTemplatesTable)
      .values({
        stationId,
        categoryId: varejo,
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
        active: true,
      })
      .returning();

    if (t) {
      await db.insert(proposalTemplateProductsTable).values([
        {
          templateId: t.id,
          order: 0,
          qty: "08",
          title: "SPOT 30 SEGUNDOS",
          description: "Insercoes diarias em horario nobre (06h-19h)",
          detail: "Producao incluida sem custo adicional",
          program: "Programacao Geral",
          tags: ["spot", "30s"],
          color: "BLUE",
        },
        {
          templateId: t.id,
          order: 1,
          qty: "01",
          title: "PATROCINIO DE QUADRO",
          description: "Patrocinio exclusivo do Quadro de Ofertas",
          detail: "Participacao ao vivo com o apresentador",
          program: "Show da Manha",
          tags: ["patrocinio", "ao vivo"],
          color: "GREEN",
        },
        {
          templateId: t.id,
          order: 2,
          qty: "12",
          title: "VINHETAS DE INTERVALO",
          description: "Vinhetas de 10 segundos em todos os intervalos",
          detail: "Alta frequencia de exposicao",
          program: "Todos os programas",
          tags: ["vinheta", "frequencia"],
          color: "YELLOW",
        },
      ]);
    }
    console.log("Varejo template OK");
  }

  if (alimentacao) {
    const [t2] = await db
      .insert(proposalTemplatesTable)
      .values({
        stationId,
        categoryId: alimentacao,
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
        active: true,
      })
      .returning();

    if (t2) {
      await db.insert(proposalTemplateProductsTable).values([
        {
          templateId: t2.id,
          order: 0,
          qty: "06",
          title: "SPOT 30S HORARIO ALMOCO",
          description: "Spots nos horarios de almoco e jantar (11h-14h e 18h-20h)",
          detail: "Producao com trilha sonora incluida",
          program: "Programacao Geral",
          tags: ["spot", "almoco"],
          color: "BLUE",
        },
        {
          templateId: t2.id,
          order: 1,
          qty: "02",
          title: "LIVE COMMERCE",
          description: "Lives nas redes sociais com participacao do restaurante",
          detail: "Producao e operacao pela equipe digital da radio",
          program: "Digital 88 FM",
          tags: ["live", "digital", "redes"],
          color: "RED",
        },
      ]);
    }
    console.log("Alimentacao template OK");
  }

  console.log("\nSeed completed successfully!");
  console.log("Admin login: admin@radio88fm.com.br / Admin@123");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
