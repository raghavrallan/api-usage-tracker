import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10000) / 10000;
}

const MODEL_CONFIG: Record<string, { platform: string; inputCostPer1k: number; outputCostPer1k: number }> = {
  "gpt-4o": { platform: "openai", inputCostPer1k: 0.005, outputCostPer1k: 0.015 },
  "gpt-4o-mini": { platform: "openai", inputCostPer1k: 0.00015, outputCostPer1k: 0.0006 },
  "gpt-4-turbo": { platform: "openai", inputCostPer1k: 0.01, outputCostPer1k: 0.03 },
  "gpt-3.5-turbo": { platform: "openai", inputCostPer1k: 0.0005, outputCostPer1k: 0.0015 },
  "text-embedding-3-small": { platform: "openai", inputCostPer1k: 0.00002, outputCostPer1k: 0 },
  "claude-sonnet-4-20250514": { platform: "anthropic", inputCostPer1k: 0.003, outputCostPer1k: 0.015 },
  "claude-3.5-haiku-20241022": { platform: "anthropic", inputCostPer1k: 0.0008, outputCostPer1k: 0.004 },
  "claude-3-opus-20240229": { platform: "anthropic", inputCostPer1k: 0.015, outputCostPer1k: 0.075 },
  "gemini-2.0-flash": { platform: "google", inputCostPer1k: 0.0001, outputCostPer1k: 0.0004 },
  "gemini-1.5-pro": { platform: "google", inputCostPer1k: 0.00125, outputCostPer1k: 0.005 },
};

interface KeyDef {
  platform: string;
  keyLabel: string;
  models: string[];
}

async function main() {
  console.log("Seeding database with mock data...\n");

  // Clear existing usage data for idempotent re-seeding
  await prisma.usageRecord.deleteMany();
  await prisma.billingSnapshot.deleteMany();
  await prisma.syncLog.deleteMany();
  await prisma.platformKey.deleteMany();
  await prisma.adminKey.deleteMany();
  await prisma.userProjectAccess.deleteMany();

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: { name: "Demo Organization", slug: "demo-org" },
  });

  // Departments
  const engineering = await prisma.department.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Engineering" } },
    update: {},
    create: { tenantId: tenant.id, name: "Engineering", description: "Platform & backend engineering" },
  });
  const ml = await prisma.department.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Machine Learning" } },
    update: {},
    create: { tenantId: tenant.id, name: "Machine Learning", description: "ML research and fine-tuning" },
  });
  const product = await prisma.department.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Product" } },
    update: {},
    create: { tenantId: tenant.id, name: "Product", description: "Product development and design" },
  });
  const marketing = await prisma.department.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Marketing" } },
    update: {},
    create: { tenantId: tenant.id, name: "Marketing", description: "Content and growth marketing" },
  });

  // Users
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: { tenantId: tenant.id, email: "admin@demo.com", passwordHash: hashSync("admin123", 12), fullName: "Admin User", role: "admin", departmentId: engineering.id },
  });
  const alice = await prisma.user.upsert({
    where: { email: "alice@demo.com" },
    update: {},
    create: { tenantId: tenant.id, email: "alice@demo.com", passwordHash: hashSync("user123", 12), fullName: "Alice Chen", role: "user", departmentId: engineering.id },
  });
  const bob = await prisma.user.upsert({
    where: { email: "bob@demo.com" },
    update: {},
    create: { tenantId: tenant.id, email: "bob@demo.com", passwordHash: hashSync("user123", 12), fullName: "Bob Kumar", role: "user", departmentId: ml.id },
  });
  const carol = await prisma.user.upsert({
    where: { email: "carol@demo.com" },
    update: {},
    create: { tenantId: tenant.id, email: "carol@demo.com", passwordHash: hashSync("user123", 12), fullName: "Carol Martinez", role: "user", departmentId: product.id },
  });
  const dave = await prisma.user.upsert({
    where: { email: "dave@demo.com" },
    update: {},
    create: { tenantId: tenant.id, email: "dave@demo.com", passwordHash: hashSync("user123", 12), fullName: "Dave Thompson", role: "user", departmentId: marketing.id },
  });

  // Projects
  const chatbot = await prisma.project.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Chatbot Production" } },
    update: {},
    create: { tenantId: tenant.id, name: "Chatbot Production", departmentId: engineering.id, description: "Customer-facing chatbot" },
  });
  const internalTools = await prisma.project.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Internal Tools" } },
    update: {},
    create: { tenantId: tenant.id, name: "Internal Tools", departmentId: engineering.id, description: "Internal developer tools" },
  });
  const research = await prisma.project.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "ML Research" } },
    update: {},
    create: { tenantId: tenant.id, name: "ML Research", departmentId: ml.id, description: "Model evaluation and benchmarking" },
  });
  const contentGen = await prisma.project.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Content Generation" } },
    update: {},
    create: { tenantId: tenant.id, name: "Content Generation", departmentId: product.id, description: "Blog posts, docs, marketing copy" },
  });
  const embeddings = await prisma.project.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Search & Embeddings" } },
    update: {},
    create: { tenantId: tenant.id, name: "Search & Embeddings", departmentId: engineering.id, description: "Semantic search pipeline" },
  });

  // User access
  const accessPairs = [
    { userId: alice.id, projectId: chatbot.id, permissionLevel: "manage" },
    { userId: alice.id, projectId: internalTools.id, permissionLevel: "manage" },
    { userId: bob.id, projectId: research.id, permissionLevel: "manage" },
    { userId: bob.id, projectId: embeddings.id, permissionLevel: "view" },
    { userId: carol.id, projectId: contentGen.id, permissionLevel: "manage" },
    { userId: carol.id, projectId: chatbot.id, permissionLevel: "view" },
    { userId: dave.id, projectId: contentGen.id, permissionLevel: "view" },
  ];
  for (const a of accessPairs) {
    await prisma.userProjectAccess.upsert({
      where: { userId_projectId: { userId: a.userId, projectId: a.projectId } },
      update: {},
      create: a,
    });
  }

  // Platform keys per project
  const keyDefs: { projectId: string; keys: KeyDef[] }[] = [
    {
      projectId: chatbot.id,
      keys: [
        { platform: "openai", keyLabel: "Chatbot GPT-4o Key", models: ["gpt-4o", "gpt-4o-mini"] },
        { platform: "anthropic", keyLabel: "Chatbot Claude Key", models: ["claude-sonnet-4-20250514", "claude-3.5-haiku-20241022"] },
      ],
    },
    {
      projectId: internalTools.id,
      keys: [
        { platform: "openai", keyLabel: "Internal Tools GPT Key", models: ["gpt-4o-mini", "gpt-3.5-turbo"] },
        { platform: "google", keyLabel: "Internal Gemini Key", models: ["gemini-2.0-flash"] },
      ],
    },
    {
      projectId: research.id,
      keys: [
        { platform: "openai", keyLabel: "Research GPT-4 Turbo", models: ["gpt-4-turbo", "gpt-4o"] },
        { platform: "anthropic", keyLabel: "Research Claude Opus", models: ["claude-3-opus-20240229", "claude-sonnet-4-20250514"] },
        { platform: "google", keyLabel: "Research Gemini Pro", models: ["gemini-1.5-pro", "gemini-2.0-flash"] },
      ],
    },
    {
      projectId: contentGen.id,
      keys: [
        { platform: "openai", keyLabel: "Content GPT-4o Key", models: ["gpt-4o", "gpt-4o-mini"] },
        { platform: "anthropic", keyLabel: "Content Claude Key", models: ["claude-sonnet-4-20250514"] },
      ],
    },
    {
      projectId: embeddings.id,
      keys: [
        { platform: "openai", keyLabel: "Embeddings Key", models: ["text-embedding-3-small"] },
      ],
    },
  ];

  const DAYS = 60;
  const now = new Date();
  let totalRecords = 0;

  for (const { projectId, keys } of keyDefs) {
    for (const keyDef of keys) {
      const pk = await prisma.platformKey.create({
        data: {
          projectId,
          platform: keyDef.platform,
          keyLabel: keyDef.keyLabel,
          redactedValue: `...${rand(1000, 9999)}`,
          isActive: true,
        },
      });

      const usageRecords = [];

      for (let d = 0; d < DAYS; d++) {
        const date = new Date(now);
        date.setDate(date.getDate() - d);
        date.setHours(0, 0, 0, 0);

        // Weekday multiplier (less usage on weekends)
        const dayOfWeek = date.getDay();
        const weekdayMult = dayOfWeek === 0 || dayOfWeek === 6 ? 0.3 : 1;

        // Gradual growth trend (more recent = more usage)
        const growthMult = 0.6 + (0.4 * (DAYS - d) / DAYS);

        for (const model of keyDef.models) {
          const config = MODEL_CONFIG[model];
          const isEmbedding = model.includes("embedding");

          const baseInput = isEmbedding ? rand(50000, 500000) : rand(2000, 80000);
          const baseOutput = isEmbedding ? 0 : rand(500, 30000);

          const inputTokens = Math.round(baseInput * weekdayMult * growthMult);
          const outputTokens = Math.round(baseOutput * weekdayMult * growthMult);
          const totalTokens = inputTokens + outputTokens;
          const costUsd = (inputTokens * config.inputCostPer1k + outputTokens * config.outputCostPer1k) / 1000;
          const requestCount = isEmbedding ? rand(100, 2000) : rand(10, 500);

          const userPool = ["alice.chen", "bob.kumar", "carol.martinez", "dave.thompson", "system-bot"];
          usageRecords.push({
            platformKeyId: pk.id,
            recordedAt: date,
            model,
            inputTokens,
            outputTokens,
            totalTokens,
            costUsd: Math.round(costUsd * 1000000) / 1000000,
            requestCount: Math.round(requestCount * weekdayMult * growthMult),
            userIdExternal: userPool[rand(0, userPool.length - 1)],
          });
        }
      }

      await prisma.usageRecord.createMany({ data: usageRecords });
      totalRecords += usageRecords.length;

      // Billing snapshot for last 30 days
      const last30 = usageRecords.filter((r) => {
        const diff = (now.getTime() - r.recordedAt.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 30;
      });
      const totalCost30 = last30.reduce((sum, r) => sum + r.costUsd, 0);
      const totalTokens30 = last30.reduce((sum, r) => sum + r.totalTokens, 0);

      await prisma.billingSnapshot.create({
        data: {
          platformKeyId: pk.id,
          periodStart: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          periodEnd: now,
          totalCostUsd: Math.round(totalCost30 * 100) / 100,
          totalTokens: totalTokens30,
          breakdown: JSON.parse(JSON.stringify(
            last30.reduce((acc, r) => {
              acc[r.model] = (acc[r.model] || 0) + r.costUsd;
              return acc;
            }, {} as Record<string, number>)
          )),
        },
      });

      // Sync log
      await prisma.syncLog.create({
        data: {
          platformKeyId: pk.id,
          syncType: "auto",
          status: "success",
          recordsSynced: usageRecords.length,
          completedAt: now,
        },
      });

      console.log(`  ${keyDef.keyLabel}: ${usageRecords.length} usage records`);
    }
  }

  console.log(`\nTotal usage records created: ${totalRecords}`);
  console.log(`\nSeed complete!`);
  console.log(`\nLogin credentials:`);
  console.log(`  Admin:  admin@demo.com / admin123`);
  console.log(`  Users:  alice@demo.com / user123`);
  console.log(`          bob@demo.com   / user123`);
  console.log(`          carol@demo.com / user123`);
  console.log(`          dave@demo.com  / user123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
