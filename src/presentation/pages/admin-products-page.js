import { ProductService } from "../../application/services/product-service.js";
import { mountLayout } from "../components/layout.js";
import { formatCurrency } from "../../shared/utils/formatters.js";
import { sanitizeText } from "../../shared/utils/formatters.js";

mountLayout("admin");

const productService = new ProductService();

const form = document.getElementById("product-form");
const messageBox = document.getElementById("form-message");
const searchInput = document.getElementById("search-admin-products");
const tbody = document.getElementById("admin-products-tbody");
const hiddenProductId = document.getElementById("product-id");
const submitButton = document.getElementById("submit-button");
const cancelEditButton = document.getElementById("cancel-edit-button");

let products = [];

init();

async function init() {
  await loadProducts();

  form.addEventListener("submit", onSubmit);
  cancelEditButton.addEventListener("click", resetForm);
  searchInput.addEventListener("input", renderTable);
}

async function loadProducts() {
  products = await productService.list();
  renderTable();
}

function renderTable() {
  const term = searchInput.value.toLowerCase().trim();
  const visibleProducts = products.filter((product) => {
    if (!term) return true;

    return [product.codigo, product.nome, product.modelo, product.fabricante]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  tbody.innerHTML = "";

  if (!visibleProducts.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-row">Nenhum produto encontrado.</td></tr>';
    return;
  }

  visibleProducts.forEach((product) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${product.codigo}</td>
      <td>${product.nome}</td>
      <td>${product.modelo}</td>
      <td>${product.fabricante || "-"}</td>
      <td>${product.categoria || "-"}</td>
      <td>${formatCurrency(product.preco)}</td>
      <td>${product.estoque}</td>
      <td class="table-actions">
        <button class="btn btn-secondary" data-action="edit" data-id="${product.id}">Editar</button>
        <button class="btn btn-danger" data-action="delete" data-id="${product.id}">Excluir</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  bindTableActions();
}

function bindTableActions() {
  tbody.querySelectorAll("button[data-action='edit']").forEach((button) => {
    button.addEventListener("click", async () => {
      const product = await productService.getById(button.dataset.id);
      if (!product) return;

      hiddenProductId.value = product.id;
      form.codigo.value = product.codigo;
      form.nome.value = product.nome;
      form.modelo.value = product.modelo;
      form.fabricante.value = product.fabricante;
      form.categoria.value = product.categoria;
      form.preco.value = product.preco;
      form.estoque.value = product.estoque;
      form.descricao.value = product.descricao;

      submitButton.textContent = "Atualizar produto";
      cancelEditButton.classList.remove("hidden");
      showMessage("Modo de edição ativado.", "info");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  tbody.querySelectorAll("button[data-action='delete']").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = window.confirm("Deseja realmente excluir este produto?");
      if (!confirmed) return;

      await productService.remove(button.dataset.id);
      showMessage("Produto excluído com sucesso.", "success");
      await loadProducts();
    });
  });
}

async function onSubmit(event) {
  event.preventDefault();

  try {
    const payload = {
      codigo: sanitizeText(form.codigo.value),
      nome: sanitizeText(form.nome.value),
      modelo: sanitizeText(form.modelo.value),
      fabricante: sanitizeText(form.fabricante.value),
      categoria: sanitizeText(form.categoria.value),
      preco: Number(form.preco.value),
      estoque: Number(form.estoque.value),
      descricao: sanitizeText(form.descricao.value),
    };

    if (hiddenProductId.value) {
      await productService.update(hiddenProductId.value, payload);
      showMessage("Produto atualizado com sucesso.", "success");
    } else {
      await productService.create(payload);
      showMessage("Produto cadastrado com sucesso.", "success");
    }

    resetForm();
    await loadProducts();
  } catch (error) {
    showMessage(error.message || "Erro ao salvar produto.", "error");
  }
}

function resetForm() {
  form.reset();
  hiddenProductId.value = "";
  submitButton.textContent = "Cadastrar produto";
  cancelEditButton.classList.add("hidden");
}

function showMessage(message, type) {
  messageBox.textContent = message;
  messageBox.className = `message ${type}`;
}
