const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envData = fs.readFileSync(envPath, 'utf8');
  envData.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key && value !== undefined) {
      process.env[key] = value.replace(/^"|"$/g, '');
    }
  });
}

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const key = serviceKey || anonKey;

console.log('env path:', envPath);
console.log('url present:', !!url);
console.log('service key present:', !!serviceKey);
console.log('anon key present:', !!anonKey);
console.log('using key type:', serviceKey ? 'service' : 'anon');

const supabase = createClient(url, key);

async function test() {
  try {
    const { data, error } = await supabase.from('modules').select('id').limit(1);
    console.log('query error:', error);
    console.log('data length:', data ? data.length : 'none');
  } catch (err) {
    console.error('caught err:', err);
  }
}

test();
