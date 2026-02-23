import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { getSession, unauthorized, notFound } from "@/lib/api-helpers";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();
  const { id } = await params;

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.fullName) data.fullName = body.fullName;
  if (body.role) data.role = body.role;
  if (body.departmentId !== undefined) data.departmentId = body.departmentId || null;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.password) data.passwordHash = await hash(body.password, 12);

  const result = await prisma.user.updateMany({
    where: { id, tenantId: session.user.tenantId },
    data,
  });
  if (result.count === 0) return notFound("User not found");
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();
  const { id } = await params;

  await prisma.user.deleteMany({ where: { id, tenantId: session.user.tenantId } });
  return NextResponse.json({ success: true });
}
