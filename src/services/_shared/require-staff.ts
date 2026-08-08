import "server-only";

import type { StaffRole } from "@prisma/client";
import type { Session } from "next-auth";
import { getServerSession } from "next-auth";

import { authOptions } from "../../lib/auth";

type PersistedStaffIdentity = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  isActive: boolean;
};

type RequireStaffDependencies = {
  getSession: () => Promise<Session | null>;
  findStaffById: (staffId: string) => Promise<PersistedStaffIdentity | null>;
};

const defaultDependencies: RequireStaffDependencies = {
  getSession: () => getServerSession(authOptions),
  findStaffById: async (staffId) => {
    const { prisma } = await import("../../lib/prisma");

    return prisma.staffUser.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
  },
};

export type RequiredStaffIdentity = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
};

export class StaffAuthenticationRequiredError extends Error {
  constructor() {
    super("Active staff authentication is required.");
    this.name = "StaffAuthenticationRequiredError";
  }
}

export async function requireStaff(
  dependencies: RequireStaffDependencies = defaultDependencies,
): Promise<RequiredStaffIdentity> {
  const session = await dependencies.getSession();
  const staffId = session?.user?.id;

  if (typeof staffId !== "string" || !staffId) {
    throw new StaffAuthenticationRequiredError();
  }

  const staff = await dependencies.findStaffById(staffId);

  if (!staff || !staff.isActive) {
    throw new StaffAuthenticationRequiredError();
  }

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
  };
}
