import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { hashStaffPassword } from "../src/services/_shared/staff-password";

function getArgument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

async function main() {
  const email = getArgument("email")?.trim().toLowerCase();
  const password = getArgument("password");

  if (!email) {
    throw new Error("L'adresse e-mail est obligatoire.");
  }

  if (!password || password.length < 10 || password.length > 200) {
    throw new Error(
      "Le mot de passe doit contenir entre 10 et 200 caractères.",
    );
  }

  const staff = await prisma.staffUser.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!staff) {
    throw new Error("Aucun compte staff ne correspond à cette adresse e-mail.");
  }

  const passwordHash = await hashStaffPassword(password);

  await prisma.staffUser.update({
    where: { id: staff.id },
    data: { passwordHash },
  });

  console.log(`Mot de passe modifié pour ${staff.name} (${staff.email}).`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Erreur inconnue.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
