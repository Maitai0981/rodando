import { ProductRepository } from "../../domain/repositories/product-repository.js";
import { appConfig } from "../../shared/config/app-config.js";

const DEFAULT_PRODUCTS = [
  {
    id: crypto.randomUUID(),
    codigo: "CAM-AR18-FN",
    nome: "Câmara de Ar",
    modelo: "Aro 18 Fina",
    fabricante: "Rodando",
    categoria: "Câmara",
    preco: 49.9,
    estoque: 40,
    descricao: "Aplicação 275-18 / 90/90-18 / 80-100-18 / 300-18",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    codigo: "CAM-AR17-LG",
    nome: "Câmara de Ar",
    modelo: "Aro 17 Larga",
    fabricante: "Rodando",
    categoria: "Câmara",
    preco: 56.5,
    estoque: 25,
    descricao: "Aplicação 110/80-17 / 120/90-17 / 130/70-17",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export class LocalStorageProductRepository extends ProductRepository {
  constructor(storage = window.localStorage) {
    super();
    this.storage = storage;
    this.seedIfNeeded();
  }

  seedIfNeeded() {
    const raw = this.storage.getItem(appConfig.storageKey);
    if (!raw) {
      this.storage.setItem(appConfig.storageKey, JSON.stringify(DEFAULT_PRODUCTS));
    }
  }

  readAll() {
    const raw = this.storage.getItem(appConfig.storageKey) ?? "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  }

  writeAll(products) {
    this.storage.setItem(appConfig.storageKey, JSON.stringify(products));
  }

  async list() {
    return this.readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getById(id) {
    return this.readAll().find((product) => product.id === id) ?? null;
  }

  async create(productInput) {
    const products = this.readAll();
    products.push(productInput);
    this.writeAll(products);
    return productInput;
  }

  async update(id, productInput) {
    const products = this.readAll();
    const index = products.findIndex((product) => product.id === id);

    if (index === -1) {
      throw new Error("Produto não encontrado para atualização.");
    }

    products[index] = { ...productInput, id };
    this.writeAll(products);
    return products[index];
  }

  async remove(id) {
    const products = this.readAll();
    const filtered = products.filter((product) => product.id !== id);
    this.writeAll(filtered);
    return true;
  }
}
