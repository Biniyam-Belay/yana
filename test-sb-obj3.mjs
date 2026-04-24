import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/"/g, '').replace(/'/g, '');
});
const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const adminKey = env['SUPABASE_SERVICE_ROLE_KEY'];

async function checkCols() {
  const res = await fetch(`${url}/rest/v1/key_results?select=color,due_date&limit=1`, {
    headers: { 'apikey': adminKey, 'Authorization': `Bearer ${adminKey}` }
  });
  console.log("KR cols:", res.status, await res.text());
  
  const res2 = await fetch(`${url}/rest/v1/objective_key_results?select=color,due_date&limit=1`, {
    headers: { 'apikey': adminKey, 'Authorization': `Bearer ${adminKey}` }
  });
  console.log("OKR cols:", res2.status, await res2.text());
}
checkCols().catch(console.error);
