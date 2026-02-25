import { Product } from "../../../domain/entities/product.js";

export class CreateProduct {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async execute(input) {
    validateProductInput(input);
    const product = Product.create(input);
    return this.productRepository.create(product);
  }
}

function validateProductInput(input) {
  if (!input.codigo || !input.nome || !input.modelo) {
    throw new Error("Código, nome e modelo são obrigatórios.");
  }

  if (Number(input.preco) < 0) {
    throw new Error("Preço não pode ser negativo.");
  }

  if (Number(input.estoque) < 0) {
    throw new Error("Estoque não pode ser negativo.");
  }
}
