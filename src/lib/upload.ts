import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "public/uploads";
const BUCKET = process.env.AWS_BUCKET_NAME;
const REGION = process.env.AWS_REGION ?? "us-east-1";

function getS3Client() {
  return new S3Client({ region: REGION });
}

async function saveToS3(file: File, subfolder: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const key = subfolder ? `${subfolder}/${filename}` : filename;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
    })
  );

  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

async function saveToLocal(file: File, subfolder: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), UPLOAD_DIR, subfolder);

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  return subfolder ? `/uploads/${subfolder}/${filename}` : `/uploads/${filename}`;
}

export async function saveFile(file: File, subfolder = ""): Promise<string> {
  if (BUCKET) {
    return saveToS3(file, subfolder);
  }
  return saveToLocal(file, subfolder);
}
