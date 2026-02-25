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
          include: { operator: true, driver: true, admin: true },
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
        };
      },
    }),
    Credentials({
      id: "otp",
      name: "OTP",
      credentials: {
        phone: { label: "Phone", type: "text" },
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.userId) return null;

        const user = await prisma.user.findUnique({
          where: { id: credentials.userId as string },
        });

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
