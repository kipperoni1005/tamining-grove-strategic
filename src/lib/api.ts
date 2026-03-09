import { supabase } from "./supabaseClient";
import type { Settings } from "./types";

export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase.from("settings").select("*").order("created_at", { ascending: false }).limit(1);
  if (error) throw error;
  if (data && data.length) return data[0] as Settings;

  const { data: created, error: createErr } = await supabase
    .from("settings")
    .insert({ standard_moisture: 13.5, currency: "KES", company_name: "Tamining Grove Limited" })
    .select()
    .single();
  if (createErr) throw createErr;
  return created as Settings;
}
