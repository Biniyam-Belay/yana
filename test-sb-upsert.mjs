import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2].replace(/"/g, '').replace(/'/g, '');
});
const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY']; // do we have one?

if(serviceRoleKey) {
  console.log("We have service role, we can bypass RLS to check for empty tables.");
} else {
  console.log("No service role key provided in env.local");
}
