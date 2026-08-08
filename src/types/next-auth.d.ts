import type { StaffRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: StaffRole;
    } & DefaultSession["user"];
  }

  interface User {
    role: StaffRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    staffId?: string;
    staffRole?: StaffRole;
  }
}
