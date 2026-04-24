import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/"/g, '').replace(/'/g, '');
});
const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const adminKey = env['SUPABASE_SERVICE_ROLE_KEY']; // To get a valid session

// 1. Get uid
let res = await fetch(`${url}/rest/v1/north_stars?select=user_id&limit=1`, {
  headers: { 'apikey': adminKey, 'Authorization': `Bearer ${adminKey}` }
});
let ns = await res.json();
if(!ns || ns.length === 0) { console.log("Empty DB"); process.exit(0); }
let u_id = ns[0].user_id;
console.log("Found UID:", u_id);

// Since we can't delete as user without JWT, let's delete as admin using the same syntax
const res2 = await fetch(`${url}/rest/v1/north_stars?user_id=eq.${u_id}`, {
  method: 'DELETE',
  headers: { 'apikey': adminKey, 'Authorization': `Bearer ${adminKey}`, 'Prefer': 'return=representation' }
});
console.log("Delete status admin:", res2.status, await res2.text());
