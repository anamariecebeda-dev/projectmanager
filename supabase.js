import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.warn("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — set them in .env");
}

export const supabase = createClient(url, anon);

// The whole app state is stored as one JSON document per signed-in user.
export async function loadDoc(userId) {
  const { data, error } = await supabase
    .from("app_state")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) { console.error("loadDoc", error); return null; }
  return data?.data ?? null;
}

export async function saveDoc(userId, doc) {
  const { error } = await supabase
    .from("app_state")
    .upsert(
      { user_id: userId, data: doc, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) console.error("saveDoc", error);
}
