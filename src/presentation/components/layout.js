export function mountLayout(activePage) {
  const header = document.querySelector("[data-layout='header']");
  const footer = document.querySelector("[data-layout='footer']");

  if (header) {
    header.innerHTML = renderHeader(activePage);
  }

  if (footer) {
    footer.innerHTML = renderFooter();
  }
}

function renderHeader(activePage) {
  const isActive = (page) => (activePage === page ? "nav-link active" : "nav-link");

  return `
    <header class="topbar">
      <div class="container bar-content">
        <a href="./index.html" class="brand">
          <span class="brand-dot"></span>
          RODANDO<span class="brand-accent">.BR</span>
        </a>
        <nav class="nav-menu">
          <a class="${isActive("home")}" href="./index.html">Início</a>
          <a class="${isActive("info")}" href="./informacoes.html">Informações Técnicas</a>
          <a class="${isActive("products")}" href="./produtos.html">Produtos</a>
          <a class="${isActive("admin")}" href="./admin-produtos.html">Gerenciar Produtos</a>
        </nav>
      </div>
    </header>
  `;
}

function renderFooter() {
  const currentYear = new Date().getFullYear();

  return `
    <footer class="footer">
      <div class="container footer-content">
        <p>Rodando.br - Peças para motos e informações técnicas.</p>
        <p>&copy; ${currentYear} Rodando.</p>
      </div>
    </footer>
  `;
}
