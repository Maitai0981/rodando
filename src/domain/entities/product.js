export class Product {
  constructor({
    id,
    codigo,
    nome,
    modelo,
    fabricante,
    categoria,
    preco,
    estoque,
    descricao,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.codigo = codigo;
    this.nome = nome;
    this.modelo = modelo;
    this.fabricante = fabricante;
    this.categoria = categoria;
    this.preco = Number(preco);
    this.estoque = Number(estoque);
    this.descricao = descricao ?? "";
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static create(input) {
    const now = new Date().toISOString();

    return new Product({
      id: input.id ?? crypto.randomUUID(),
      codigo: String(input.codigo ?? "").trim(),
      nome: String(input.nome ?? "").trim(),
      modelo: String(input.modelo ?? "").trim(),
      fabricante: String(input.fabricante ?? "").trim(),
      categoria: String(input.categoria ?? "").trim(),
      preco: Number(input.preco ?? 0),
      estoque: Number(input.estoque ?? 0),
      descricao: String(input.descricao ?? "").trim(),
      createdAt: input.createdAt ?? now,
      updatedAt: now,
    });
  }
}
