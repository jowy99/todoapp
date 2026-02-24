import "dotenv/config";
import { Client } from "pg";

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required. Add it to your .env file.`);
  }

  return value;
}

function getDatabaseName(databaseUrl: string): string {
  const pathname = new URL(databaseUrl).pathname.replace(/^\/+/, "");

  if (!pathname) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  return decodeURIComponent(pathname);
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function main() {
  const adminUrl = getRequiredEnv("DATABASE_ADMIN_URL");
  const appDbUrl = getRequiredEnv("DATABASE_URL");
  const appDatabaseName = getDatabaseName(appDbUrl);

  const client = new Client({
    connectionString: adminUrl,
  });

  await client.connect();

  try {
    const existsResult = await client.query<{ exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
      [appDatabaseName],
    );

    const exists = existsResult.rows[0]?.exists ?? false;

    if (exists) {
      console.log(`Database "${appDatabaseName}" already exists.`);
      return;
    }

    await client.query(`CREATE DATABASE ${quoteIdentifier(appDatabaseName)}`);
    console.log(`Database "${appDatabaseName}" created.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Failed to create database:", error.message);
  process.exit(1);
});
