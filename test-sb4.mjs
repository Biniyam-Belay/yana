import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/"/g, '').replace(/'/g, '');
});
const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

async function checkTable(table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  console.log(table, ":", res.status);
}

const tables = ["north_stars", "key_results", "objectives", "tasks", "time_blocks", "north_star_milestones", "focus_timer_sessions", "financials", "financial_accounts", "financial_flows", "financial_buckets", "biometrics", "biometric_protocols", "biometric_intakes", "telemetry", "tactical_matrix_items", "tactical_commands", "tactical_blocks", "tactical_inbox_items", "professional_tasks", "objective_key_results"];

async function run() {
  for (const t of tables) {
    await checkTable(t);
  }
}
run();
