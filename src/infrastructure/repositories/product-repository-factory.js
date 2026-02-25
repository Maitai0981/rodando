import { appConfig } from "../../shared/config/app-config.js";
import { LocalStorageProductRepository } from "./local-storage-product-repository.js";
import { SupabaseProductRepository } from "./supabase-product-repository.js";

export function createProductRepository() {
  if (appConfig.useSupabase) {
    return new SupabaseProductRepository();
  }

  return new LocalStorageProductRepository();
}
