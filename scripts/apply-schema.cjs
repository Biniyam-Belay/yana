const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    if (!line || line.trim().startsWith("#")) return;
    const idx = line.indexOf("=");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  });
}

loadEnv(path.resolve(__dirname, "..", ".env.local"));

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Missing SUPABASE_DB_URL in .env.local (use the Supabase Postgres connection string). ");
  process.exit(1);
}

const schemaPath = path.resolve(__dirname, "..", "supabase", "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");

const sslRequired = connectionString.includes("sslmode=require");
const client = new Client({
  connectionString,
  ssl: sslRequired ? { rejectUnauthorized: false } : undefined,
  family: 4,
});

async function run() {
  await client.connect();
  await client.query(schemaSql);
  await client.end();
  console.log("✅ Schema applied");
}

run().catch((error) => {
  console.error("Schema apply failed:", error);
  process.exit(1);
});
