import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, unauthorized, notFound, badRequest } from "@/lib/api-helpers";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();
  const { id } = await params;

  const body = await req.json();
  const dept = await prisma.department.updateMany({
    where: { id, tenantId: session.user.tenantId },
    data: { name: body.name, description: body.description },
  });
  if (dept.count === 0) return notFound("Department not found");
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();
  const { id } = await params;

  await prisma.department.deleteMany({ where: { id, tenantId: session.user.tenantId } });
  return NextResponse.json({ success: true });
}
