import "dotenv/config";

import { Prisma, StaffRole } from "@prisma/client";
import { z, ZodError } from "zod";

import { hashStaffPassword } from "../src/services/_shared/staff-password";

const staffAccountInputSchema = z.strictObject({
  name: z
    .string({ error: "Staff name is required." })
    .trim()
    .min(1, "Staff name is required."),
  email: z
    .string({ error: "A valid staff email is required." })
    .trim()
    .toLowerCase()
    .email("A valid staff email is required."),
  password: z
    .string({ error: "Staff password is required." })
    .min(10, "Staff password must contain at least 10 characters.")
    .max(200, "Staff password cannot exceed 200 characters."),
  role: z.enum(StaffRole, {
    error: "Staff role must be ADMIN or STAFF.",
  }),
});

class StaffEmailAlreadyExistsError extends Error {
  constructor() {
    super("A staff account with this email already exists.");
    this.name = "StaffEmailAlreadyExistsError";
  }
}

function optionValue(option: string): string | undefined {
  const optionIndex = process.argv.indexOf(option);
  const value = optionIndex === -1 ? undefined : process.argv[optionIndex + 1];

  return value && !value.startsWith("--") ? value : undefined;
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function createStaffAccount() {
  const input = staffAccountInputSchema.parse({
    name: optionValue("--name"),
    email: optionValue("--email"),
    password: optionValue("--password"),
    role: optionValue("--role"),
  });
  const passwordHash = await hashStaffPassword(input.password);
  const { prisma } = await import("../src/lib/prisma");

  try {
    await prisma.staffUser.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      },
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      throw new StaffEmailAlreadyExistsError();
    }

    throw error;
  } finally {
    await prisma.$disconnect();
  }

  console.log(`Staff account created: ${input.email} (${input.role})`);
}

createStaffAccount().catch((error: unknown) => {
  if (error instanceof ZodError) {
    console.error(
      "Invalid staff account input:",
      error.issues.map((issue) => issue.message).join(" "),
    );
  } else if (error instanceof StaffEmailAlreadyExistsError) {
    console.error(error.message);
  } else {
    console.error("Unable to create staff account.");
  }

  console.error(
    "Usage: pnpm staff:create -- --name <name> --email <email> --password <password> --role <ADMIN|STAFF>",
  );
  process.exitCode = 1;
});
