const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

let supabase = null;

try {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("🟢 Cliente de Supabase inicializado correctamente.");
  } else {
    console.warn("⚠️ Faltan variables de entorno de Supabase (SUPABASE_URL, SUPABASE_SERVICE_KEY). Usando MOCK de datos en memoria.");
  }
} catch (error) {
  console.error("❌ Error al inicializar el cliente de Supabase:", error.message);
}

module.exports = { supabase };
