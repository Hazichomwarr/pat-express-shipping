import { StaffRole } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { authenticateStaffCredentials } from "../services/_shared/staff-authentication";

function isStaffRole(value: unknown): value is StaffRole {
  return value === StaffRole.ADMIN || value === StaffRole.STAFF;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Identifiants du personnel",
      credentials: {
        email: {
          label: "Adresse e-mail",
          type: "email",
        },
        password: {
          label: "Mot de passe",
          type: "password",
        },
      },
      authorize: async (credentials) =>
        authenticateStaffCredentials(credentials),
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.staffId = user.id;
        token.staffRole = user.role;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (
        session.user &&
        typeof token.staffId === "string" &&
        isStaffRole(token.staffRole)
      ) {
        session.user.id = token.staffId;
        session.user.role = token.staffRole;
      }

      return session;
    },
  },
};
