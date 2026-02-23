import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized } from "@/lib/api-helpers";
import { syncAllKeys, syncSingleKey } from "@/lib/sync-service";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();

  const body = await req.json().catch(() => ({}));
  const { keyId } = body;

  try {
    if (keyId) {
      const result = await syncSingleKey(keyId, "manual");
      return NextResponse.json(result);
    } else {
      const results = await syncAllKeys(session.user.tenantId);
      return NextResponse.json({ results });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const logs = await prisma.syncLog.findMany({
    where: { platformKey: { project: { tenantId: session.user.tenantId } } },
    include: {
      platformKey: { select: { keyLabel: true, platform: true, project: { select: { name: true } } } },
    },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(logs);
}
