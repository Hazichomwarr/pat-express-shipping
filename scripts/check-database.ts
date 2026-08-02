import "dotenv/config";

function formatError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const connectionString = process.env.DATABASE_URL;

  return connectionString
    ? message.replaceAll(connectionString, "[redacted]")
    : message;
}

async function checkDatabase() {
  const { prisma } = await import("../src/lib/prisma");

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database connection successful.");
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase().catch((error: unknown) => {
  console.error("Database connectivity check failed:", formatError(error));
  process.exitCode = 1;
});
