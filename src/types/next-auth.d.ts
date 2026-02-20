import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      operatorId: string | null;
      operatorStatus: string | null;
      driverId: string | null;
    };
  }

  interface User {
    role?: string;
    operatorId?: string | null;
    operatorStatus?: string | null;
    driverId?: string | null;
  }
}
