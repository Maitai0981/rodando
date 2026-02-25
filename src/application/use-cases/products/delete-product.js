export class DeleteProduct {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async execute(id) {
    if (!id) {
      throw new Error("ID do produto é obrigatório.");
    }

    return this.productRepository.remove(id);
  }
}
