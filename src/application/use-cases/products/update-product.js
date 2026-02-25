import { Product } from "../../../domain/entities/product.js";

export class UpdateProduct {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async execute(id, input) {
    if (!id) {
      throw new Error("ID do produto é obrigatório.");
    }

    const existing = await this.productRepository.getById(id);
    if (!existing) {
      throw new Error("Produto não encontrado.");
    }

    const merged = Product.create({
      ...existing,
      ...input,
      id,
      createdAt: existing.createdAt,
    });

    return this.productRepository.update(id, merged);
  }
}
