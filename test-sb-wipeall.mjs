import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/"/g, '').replace(/'/g, '');
});
const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const adminKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const tables = [
  "tactical_matrix_items",
  "tactical_commands",
  "tactical_blocks",
  "tactical_inbox_items",
  "professional_tasks",
  "key_results",
  "objectives",
  "objective_key_results",
  "north_stars",
  "tasks",
  "time_blocks",
  "focus_timer_sessions",
  "financials",
  "financial_accounts",
  "financial_flows",
  "financial_buckets",
  "biometrics",
  "biometric_protocols",
  "biometric_intakes",
  "north_star_milestones",
  "telemetry"
];

async function wipe() {
  let res = await fetch(`${url}/rest/v1/north_stars?select=user_id&limit=1`, {
    headers: { 'apikey': adminKey, 'Authorization': `Bearer ${adminKey}` }
  });
  let ns = await res.json();
  if(!ns || ns.length === 0) { console.log("Empty DB"); return; }
  let u_id = ns[0].user_id;

  for (const table of tables) {
    const dRes = await fetch(`${url}/rest/v1/${table}?user_id=eq.${u_id}`, {
      method: 'DELETE',
      headers: { 'apikey': adminKey, 'Authorization': `Bearer ${adminKey}`, 'Prefer': 'return=representation' }
    });
    console.log(`Wiped ${table}:`, dRes.status);
  }
}
wipe();
