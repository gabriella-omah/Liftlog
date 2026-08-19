// backend/supabase.js
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL in .env");
}

if (!supabaseSecretKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY in .env");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
});

console.log("=================================");
console.log("SUPABASE ADMIN CONFIG");
console.log("=================================");
console.log("URL:", supabaseUrl);
console.log("Secret key loaded:", !!supabaseSecretKey);
console.log("Secret key prefix:", String(supabaseSecretKey).slice(0, 12));
console.log("Secret key length:", String(supabaseSecretKey).length);
console.log("=================================");

module.exports = supabaseAdmin;