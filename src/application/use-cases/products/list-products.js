export class ListProducts {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async execute() {
    return this.productRepository.list();
  }
}
