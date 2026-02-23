import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { getSession, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();

  const users = await prisma.user.findMany({
    where: { tenantId: session.user.tenantId },
    select: {
      id: true, email: true, fullName: true, role: true,
      isActive: true, departmentId: true, createdAt: true,
      department: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "admin") return unauthorized();

  const { email, password, fullName, role, departmentId } = await req.json();
  if (!email || !password || !fullName) return badRequest("email, password, fullName are required");

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.create({
    data: {
      tenantId: session.user.tenantId,
      email,
      passwordHash,
      fullName,
      role: role || "user",
      departmentId,
    },
  });
  return NextResponse.json({ id: user.id, email: user.email, fullName: user.fullName });
}
