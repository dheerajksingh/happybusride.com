import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cacheDel } from "@/lib/cache";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { key } = await params;
  await cacheDel(key);
  return NextResponse.json({ success: true, key });
}
