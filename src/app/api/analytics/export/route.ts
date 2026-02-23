import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const range = parseInt(searchParams.get("range") || "30");
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - range);

  const records = await prisma.usageRecord.findMany({
    where: {
      platformKey: { project: { tenantId: session.user.tenantId } },
      recordedAt: { gte: startDate },
    },
    include: {
      platformKey: {
        select: { keyLabel: true, platform: true, project: { select: { name: true } } },
      },
    },
    orderBy: { recordedAt: "desc" },
  });

  const header = "Date,Project,Platform,Key,Model,Input Tokens,Output Tokens,Total Tokens,Cost (USD),Requests\n";
  const rows = records.map((r) =>
    [
      r.recordedAt.toISOString().split("T")[0],
      `"${r.platformKey.project.name}"`,
      r.platformKey.platform,
      `"${r.platformKey.keyLabel}"`,
      r.model,
      r.inputTokens,
      r.outputTokens,
      r.totalTokens,
      r.costUsd.toFixed(6),
      r.requestCount,
    ].join(",")
  );

  const csv = header + rows.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="usage-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
