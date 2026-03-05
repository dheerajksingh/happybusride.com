import { jwtVerify } from "jose";

export interface MobileSession {
  user: {
    id: string;
    role: string;
    operatorId: string | null;
    operatorStatus: string | null;
    driverId: string | null;
  };
}

export async function getMobileSession(req: Request): Promise<MobileSession | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return {
      user: {
        id: payload.sub!,
        role: payload.role as string,
        operatorId: (payload.operatorId as string) ?? null,
        operatorStatus: (payload.operatorStatus as string) ?? null,
        driverId: (payload.driverId as string) ?? null,
      },
    };
  } catch {
    return null;
  }
}
