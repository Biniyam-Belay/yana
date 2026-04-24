import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/"/g, '').replace(/'/g, '');
});
const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const adminKey = env['SUPABASE_SERVICE_ROLE_KEY'];

async function testInsert() {
  const res2 = await fetch(`${url}/rest/v1/objectives?select=due_date&limit=1`, {
    headers: { 'apikey': adminKey, 'Authorization': `Bearer ${adminKey}` }
  });
  console.log("Cols check Obj:", res2.status, await res2.text());
  
  const res3 = await fetch(`${url}/rest/v1/key_results?select=due_date&limit=1`, {
    headers: { 'apikey': adminKey, 'Authorization': `Bearer ${adminKey}` }
  });
  console.log("Cols check KR:", res3.status, await res3.text());
}
testInsert().catch(console.error);
