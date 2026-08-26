const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const isPlaceholder = (val) => {
  return !val || val.includes('your-') || val === '';
};

let supabase = null;       // anon client — for Auth (signUp, signIn)
let supabaseAdmin = null;  // service role client — for DB table operations (bypasses RLS)
let useMock = true;

if (!isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey)) {
  try {
    // Anon client for Auth operations
    supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Service role client for DB writes (bypasses RLS)
    if (!isPlaceholder(supabaseServiceKey)) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      console.log('[GLOBEX BACKEND] Supabase admin client (service role) initialized.');
    } else {
      console.warn('[GLOBEX BACKEND] No service role key found. DB writes will use anon client (may fail due to RLS).');
      supabaseAdmin = supabase; // fallback to anon
    }

    useMock = false;
    console.log('[GLOBEX BACKEND] Supabase client initialized successfully.');
  } catch (error) {
    console.error('[GLOBEX BACKEND] Failed to initialize Supabase client:', error.message);
    console.log('[GLOBEX BACKEND] Falling back to mock memory database store.');
  }
} else {
  console.warn('[GLOBEX BACKEND] Supabase URL or Anon Key is missing or placeholder. Running in Mock Fallback Mode.');
}

module.exports = {
  supabase,       // use for: supabase.auth.signUp, supabase.auth.signInWithPassword
  supabaseAdmin,  // use for: all .from('table').insert/select/update operations
  useMock
};
