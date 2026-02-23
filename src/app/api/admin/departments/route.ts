import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();

  const departments = await prisma.department.findMany({
    where: { tenantId: session.user.tenantId },
    include: { _count: { select: { users: true, projects: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(departments);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();

  const { name, description } = await req.json();
  if (!name) return badRequest("name is required");

  const dept = await prisma.department.create({
    data: { tenantId: session.user.tenantId, name, description },
  });
  return NextResponse.json(dept);
}
