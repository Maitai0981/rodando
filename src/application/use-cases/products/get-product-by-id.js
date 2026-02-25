export class GetProductById {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async execute(id) {
    if (!id) {
      throw new Error("ID do produto é obrigatório.");
    }

    return this.productRepository.getById(id);
  }
}
