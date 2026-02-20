import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "public/uploads";

export async function saveFile(file: File, subfolder = ""): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), UPLOAD_DIR, subfolder);

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  const publicPath = subfolder ? `/uploads/${subfolder}/${filename}` : `/uploads/${filename}`;
  return publicPath;
}
