const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('✅ Supabase client initialized with Service Role (Admin access)');
  } else {
    console.log('✅ Supabase client initialized with Anon Key');
  }
} else {
  console.warn('⚠️ Supabase credentials missing. Supabase will not be available.');
}

module.exports = { supabase };
