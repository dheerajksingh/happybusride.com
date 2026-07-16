import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { operator: true, driver: true, admin: true, corporateProfile: true, agent: true },
        });

        if (!user || !user.passwordHash) return null;
        if (!user.isActive) return null;

        const valid = await compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          operatorId: user.operator?.id ?? null,
          operatorStatus: user.operator?.status ?? null,
          driverId: user.driver?.id ?? null,
          corporateCompanyId: user.corporateProfile?.companyId ?? null,
          agentId: user.agent?.id ?? null,
        };
      },
    }),
    Credentials({
      id: "otp",
      name: "OTP",
      credentials: {
        phone: { label: "Phone", type: "text" },
      },
      async authorize(credentials) {
        const phone = credentials?.phone as string | undefined;
        if (!phone) return null;

        // One-time proof: an OTP for this phone verified within the last 5
        // minutes (via /api/otp/verify or /api/otp/widget-verify).
        const proof = await prisma.otpRequest.findFirst({
          where: { phone, usedAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
          orderBy: { usedAt: "desc" },
        });
        if (!proof) return null;

        // Consume it so the same verification can't establish a second session.
        const { count } = await prisma.otpRequest.deleteMany({ where: { id: proof.id } });
        if (count !== 1) return null;

        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user || !user.isActive) return null;

        return {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
          operatorId: null,
          operatorStatus: null,
          driverId: null,
        };
      },
    }),
  ],
});
