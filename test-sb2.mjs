import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/"/g, '').replace(/'/g, '');
});
const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

async function testQuery() {
  const res2 = await fetch(`${url}/rest/v1/tactical_blocks`, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: "123e4567-e89b-12d3-a456-426614174000",
      user_id: "00000000-0000-0000-0000-000000000000",
      day_offset: 0,
      start_hr: 9,
      end_hr: 10,
      title: "Test",
      type: "admin",
      task_id: null,
      objective_id: null
    })
  });
  console.log("INSERT tactical_blocks:", res2.status, await res2.text());
}
testQuery();
