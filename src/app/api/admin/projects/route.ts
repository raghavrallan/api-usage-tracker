import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();

  const projects = await prisma.project.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      department: { select: { name: true } },
      _count: { select: { platformKeys: true, userAccess: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();

  const { name, description, departmentId } = await req.json();
  if (!name) return badRequest("name is required");

  const project = await prisma.project.create({
    data: { tenantId: session.user.tenantId, name, description, departmentId },
  });
  return NextResponse.json(project);
}
