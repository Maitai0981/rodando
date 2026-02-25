// Contrato do repositório de produtos.
// Implementações: LocalStorageProductRepository, SupabaseProductRepository.
export class ProductRepository {
  async list() {
    throw new Error("Method not implemented: list");
  }

  async getById(_id) {
    throw new Error("Method not implemented: getById");
  }

  async create(_productInput) {
    throw new Error("Method not implemented: create");
  }

  async update(_id, _productInput) {
    throw new Error("Method not implemented: update");
  }

  async remove(_id) {
    throw new Error("Method not implemented: remove");
  }
}
