import { ProductRepository } from "../../domain/repositories/product-repository.js";
import { getSupabaseClient } from "../supabase/supabase-client.js";

const TABLE_NAME = "products";

export class SupabaseProductRepository extends ProductRepository {
  constructor() {
    super();
    this.client = getSupabaseClient();
  }

  async list() {
    const { data, error } = await this.client
      .from(TABLE_NAME)
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapToDomain);
  }

  async getById(id) {
    const { data, error } = await this.client
      .from(TABLE_NAME)
      .select("*")
      .eq("id", id)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data ? mapToDomain(data) : null;
  }

  async create(productInput) {
    const { data, error } = await this.client
      .from(TABLE_NAME)
      .insert(mapToDb(productInput))
      .select("*")
      .single();

    if (error) throw error;
    return mapToDomain(data);
  }

  async update(id, productInput) {
    const { data, error } = await this.client
      .from(TABLE_NAME)
      .update(mapToDb(productInput))
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return mapToDomain(data);
  }

  async remove(id) {
    const { error } = await this.client.from(TABLE_NAME).delete().eq("id", id);
    if (error) throw error;
    return true;
  }
}

function mapToDb(product) {
  return {
    id: product.id,
    codigo: product.codigo,
    nome: product.nome,
    modelo: product.modelo,
    fabricante: product.fabricante,
    categoria: product.categoria,
    preco: Number(product.preco),
    estoque: Number(product.estoque),
    descricao: product.descricao,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  };
}

function mapToDomain(row) {
  return {
    id: row.id,
    codigo: row.codigo,
    nome: row.nome,
    modelo: row.modelo,
    fabricante: row.fabricante,
    categoria: row.categoria,
    preco: row.preco,
    estoque: row.estoque,
    descricao: row.descricao,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
