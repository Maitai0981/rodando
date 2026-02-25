import { appConfig } from "../../shared/config/app-config.js";

export function getSupabaseClient() {
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    throw new Error(
      "SDK do Supabase não encontrado. Inclua https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2 no HTML.",
    );
  }

  if (!appConfig.supabaseUrl || !appConfig.supabaseAnonKey) {
    throw new Error("Configure supabaseUrl e supabaseAnonKey em src/shared/config/app-config.js");
  }

  return window.supabase.createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey);
}
