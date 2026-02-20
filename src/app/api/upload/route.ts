import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveFile } from "@/lib/upload";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const subfolder = (formData.get("subfolder") as string) ?? "kyc";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

  try {
    const url = await saveFile(file, subfolder);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
