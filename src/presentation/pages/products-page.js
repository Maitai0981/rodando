import { ProductService } from "../../application/services/product-service.js";
import { mountLayout } from "../components/layout.js";
import { formatCurrency } from "../../shared/utils/formatters.js";

mountLayout("products");

const productService = new ProductService();
const listContainer = document.getElementById("products-list");
const searchInput = document.getElementById("search-products");
const emptyState = document.getElementById("products-empty-state");

let products = [];
let filteredProducts = [];

init();

async function init() {
  products = await productService.list();
  filteredProducts = [...products];
  renderList();

  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase().trim();
    filteredProducts = products.filter((product) => {
      const haystack = [
        product.codigo,
        product.nome,
        product.modelo,
        product.fabricante,
        product.categoria,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });

    renderList();
  });
}

function renderList() {
  listContainer.innerHTML = "";

  if (!filteredProducts.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  filteredProducts.forEach((product) => {
    const card = document.createElement("article");
    card.className = "card product-card";
    card.innerHTML = `
      <span class="tag">${product.categoria || "Peça"}</span>
      <h3>${product.nome}</h3>
      <p class="muted">Modelo: ${product.modelo}</p>
      <p class="muted">Código: ${product.codigo}</p>
      <p class="muted">Fabricante: ${product.fabricante || "-"}</p>
      <p class="price">${formatCurrency(product.preco)}</p>
      <p class="stock">Estoque: ${product.estoque}</p>
      <p class="description">${product.descricao || "Sem descrição."}</p>
    `;
    listContainer.appendChild(card);
  });
}
