import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/"/g, '').replace(/'/g, '');
});
const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const adminKey = env['SUPABASE_SERVICE_ROLE_KEY'];

async function checkRows(table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
    headers: { 'apikey': adminKey, 'Authorization': `Bearer ${adminKey}` }
  });
  const data = await res.json();
  console.log(table, "Rows:", data.length);
}

const tables = ["north_stars", "key_results", "objectives", "tasks", "professional_tasks", "tactical_blocks"];

for (const t of tables) {
  await checkRows(t);
}

