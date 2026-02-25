import type { NextAuthConfig } from "next-auth";

// Edge-safe auth config: no Node.js-only imports (no bcryptjs, no prisma).
// Used by middleware. Full providers are added in src/lib/auth.ts.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" as const },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.operatorId = user.operatorId ?? null;
        token.operatorStatus = user.operatorStatus ?? null;
        token.driverId = user.driverId ?? null;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.operatorId = token.operatorId;
        session.user.operatorStatus = token.operatorStatus;
        session.user.driverId = token.driverId;
      }
      return session;
    },
  },
  providers: [], // providers added in src/lib/auth.ts
} satisfies NextAuthConfig;
