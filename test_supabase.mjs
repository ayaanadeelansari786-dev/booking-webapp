// Standalone test — run with: node test_supabase.mjs
// This bypasses Next.js entirely to check if the issue is Next-specific
// or a deeper Node/network issue on this machine.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xuxyrxfrdobrqcebkhir.supabase.co";
const supabaseAnonKey = "sb_publishable_MLyostMfuFmSbGZuRup6JQ_l6OT-JBA"; // same one from .env.local

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const result = await supabase
  .from("bookings")
  .select("*")
  .eq("business_id", "1a517085-9915-476d-afe4-5cfa4dc133c8");

console.log("RESULT:", JSON.stringify(result, null, 2));
