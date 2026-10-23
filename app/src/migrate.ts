import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";
import path from "node:path";

async function main() {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_SSL_CA } = process.env;
  const DB_PORT = Number(process.env.DB_PORT) || 3306;

  if (!DB_HOST || !DB_USER || !DB_PASSWORD) {
    throw new Error("DB_HOST, DB_USER and DB_PASSWORD are required");
  }

  // schema.sql is copied next to this file by the Dockerfile.
  const sql = readFileSync(
    path.join(import.meta.dirname, "schema.sql"),
    "utf8",
  );

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
    ...(DB_SSL_CA
      ? {
          ssl: {
            ca: readFileSync(DB_SSL_CA, "utf8"),
            rejectUnauthorized: true,
          },
        }
      : {}),
  });

  try {
    await conn.query(sql);
    console.log("Schema applied.");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
