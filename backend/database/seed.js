import "dotenv/config";
import { pool } from "../src/config/database.js";
import { cadastrar, porEmail } from "../src/models/usuario.model.js";
import { listar, salvar } from "../src/models/cadastros.model.js";
import { criar } from "../src/models/lancamentos.model.js";
import { hoje, moverMes } from "../src/models/regras.js";
try {
  for (const [nome, email, cpf] of [
    ["Ana Demo", "ana@example.com", "52998224725"],
    ["Bruno Demo", "bruno@example.com", "11144477735"],
  ]) {
    if (await porEmail(email)) {
      console.log(email, "já existe; preservado.");
      continue;
    }
    const usuario = await cadastrar({
      nome,
      email,
      cpf,
      senha: "Demo12345",
      confirmacaoSenha: "Demo12345",
    });
    const categorias = await listar("categorias", usuario.id);
    const fontes = await listar("fontes", usuario.id);
    const cartao = await salvar("fontes", usuario.id, null, {
      nome: "Cartão demonstração",
      tipo: "cartao_credito",
      diaFechamento: 3,
      diaVencimento: 10,
      limite: "5000.00",
    });
    const categoria = (nome) => categorias.find((c) => c.nome === nome).id;
    for (const deslocamento of [-2, -1, 0]) {
      await criar(usuario.id, {
        tipo: "entrada",
        descricao: "Salário mensal",
        valor: "4500.00",
        data: moverMes(hoje(), deslocamento, 5),
        categoriaId: categoria("Salário"),
        fonteDestinoId: fontes[0].id,
      });
      await criar(usuario.id, {
        tipo: "saida",
        descricao: "Aluguel",
        valor: "1200.00",
        data: moverMes(hoje(), deslocamento, 8),
        categoriaId: categoria("Moradia"),
        fonteDestinoId: fontes[0].id,
      });
      await criar(usuario.id, {
        tipo: "saida",
        descricao: "Supermercado",
        valor: "650.40",
        data: moverMes(hoje(), deslocamento, 12),
        categoriaId: categoria("Alimentação"),
        fonteDestinoId: fontes[0].id,
      });
    }
    await criar(usuario.id, {
      tipo: "saida",
      descricao: "Notebook",
      valor: "2400.00",
      data: moverMes(hoje(), 0, 3),
      categoriaId: categoria("Educação"),
      fonteDestinoId: cartao.id,
      totalParcelas: 6,
    });
    console.log("Criado:", email);
  }
  console.log("Senha local de demonstração: Demo12345");
} finally {
  await pool.end();
}
