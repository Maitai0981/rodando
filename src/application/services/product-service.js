import { CreateProduct } from "../use-cases/products/create-product.js";
import { DeleteProduct } from "../use-cases/products/delete-product.js";
import { GetProductById } from "../use-cases/products/get-product-by-id.js";
import { ListProducts } from "../use-cases/products/list-products.js";
import { UpdateProduct } from "../use-cases/products/update-product.js";
import { createProductRepository } from "../../infrastructure/repositories/product-repository-factory.js";

export class ProductService {
  constructor(productRepository = createProductRepository()) {
    this.listProducts = new ListProducts(productRepository);
    this.getProductById = new GetProductById(productRepository);
    this.createProduct = new CreateProduct(productRepository);
    this.updateProduct = new UpdateProduct(productRepository);
    this.deleteProduct = new DeleteProduct(productRepository);
  }

  async list() {
    return this.listProducts.execute();
  }

  async getById(id) {
    return this.getProductById.execute(id);
  }

  async create(input) {
    return this.createProduct.execute(input);
  }

  async update(id, input) {
    return this.updateProduct.execute(id, input);
  }

  async remove(id) {
    return this.deleteProduct.execute(id);
  }
}
