import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/"/g, '').replace(/'/g, '');
});
const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const adminKey = env['SUPABASE_SERVICE_ROLE_KEY'];

async function testInsert() {
  let res = await fetch(`${url}/rest/v1/north_stars?select=*&limit=1`, {
    headers: { 'apikey': adminKey, 'Authorization': `Bearer ${adminKey}` }
  });
  let ns = await res.json();
  let ns_id = ns[0].id;
  let u_id = ns[0].user_id;

  const res2 = await fetch(`${url}/rest/v1/objectives`, {
    method: 'POST',
    headers: { 'apikey': adminKey, 'Authorization': `Bearer ${adminKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify({
      id: "223e4567-e89b-12d3-a456-426614174000",
      user_id: u_id,
      north_star_id: ns_id,
      tier: "Quarter",
      title: "Test Obj",
      progress: 0,
      status: "on-track",
      color: null,
      due_date: null
    })
  });
  console.log("INSERT obj:", res2.status, await res2.text());
}
testInsert().catch(console.error);
