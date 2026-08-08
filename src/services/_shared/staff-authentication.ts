import "server-only";

import { type StaffRole } from "@prisma/client";

import { verifyStaffPassword } from "./staff-password";

type StaffAuthenticationRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: StaffRole;
  isActive: boolean;
};

type StaffAuthenticationDependencies = {
  findStaffByEmail: (
    normalizedEmail: string,
  ) => Promise<StaffAuthenticationRecord | null>;
  verifyPassword: (password: string, storedHash: string) => Promise<boolean>;
};

const defaultDependencies: StaffAuthenticationDependencies = {
  findStaffByEmail: async (normalizedEmail) => {
    const { prisma } = await import("../../lib/prisma");

    return prisma.staffUser.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
      },
    });
  },
  verifyPassword: verifyStaffPassword,
};

export type AuthenticatedStaffIdentity = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function authenticateStaffCredentials(
  credentials: unknown,
  dependencies: StaffAuthenticationDependencies = defaultDependencies,
): Promise<AuthenticatedStaffIdentity | null> {
  if (!isRecord(credentials)) {
    return null;
  }

  const { email, password } = credentials;

  if (typeof email !== "string" || typeof password !== "string") {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return null;
  }

  const staff = await dependencies.findStaffByEmail(normalizedEmail);

  if (!staff || !staff.isActive) {
    return null;
  }

  const passwordMatches = await dependencies.verifyPassword(
    password,
    staff.passwordHash,
  );

  if (!passwordMatches) {
    return null;
  }

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
  };
}
