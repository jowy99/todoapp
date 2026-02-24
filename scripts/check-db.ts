import "dotenv/config";
import { Client } from "pg";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Add it to your .env file.");
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  await client.connect();

  try {
    const identity = await client.query<{
      current_database: string;
      current_user: string;
    }>("SELECT current_database(), current_user");

    const info = identity.rows[0];
    console.log(`Connected to database="${info.current_database}" as user="${info.current_user}".`);

    const tables = await client.query<{ table_name: string }>(
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name ASC
      `,
    );

    if (tables.rows.length === 0) {
      console.log("No tables found in public schema.");
      return;
    }

    console.log("Tables in public schema:");
    for (const row of tables.rows) {
      console.log(`- ${row.table_name}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Database check failed:", error.message);
  process.exit(1);
});
