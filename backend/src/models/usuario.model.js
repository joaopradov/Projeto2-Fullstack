import bcrypt from "bcrypt";
import { pool } from "../config/database.js";
import { transacao } from "./transacao.js";
import { texto, exigir, cpfValido } from "./regras.js";
export async function cadastrar(body) {
  const nome = texto(body.nome, "nome", 120);
  const email = texto(body.email, "email", 160).toLowerCase();
  exigir(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "email", "E-mail inválido.");
  const cpf = texto(body.cpf, "cpf", 20).replace(/\D/g, "");
  exigir(cpfValido(cpf), "cpf", "CPF inválido.");
  const senha = body.senha;
  exigir(
    typeof senha === "string" &&
      senha.length >= 8 &&
      Buffer.byteLength(senha) <= 72 &&
      /[a-zA-Z]/.test(senha) &&
      /[0-9]/.test(senha),
    "senha",
    "Use pelo menos 8 caracteres com letras e números (máximo 72 bytes).",
  );
  exigir(
    senha === body.confirmacaoSenha,
    "confirmacaoSenha",
    "As senhas devem ser iguais.",
  );
  const hash = await bcrypt.hash(senha, 12);
  // Usuário e padrões são uma unidade: ou tudo é salvo, ou nada é salvo.
  return transacao(async (client) => {
    const {
      rows: [usuario],
    } = await client.query(
      "INSERT INTO usuarios(nome,email,cpf,senha_hash) VALUES($1,$2,$3,$4) RETURNING id,nome,email",
      [nome, email, cpf, hash],
    );
    for (const [nomeCategoria, tipo] of [
      ["Salário", "entrada"],
      ["Alimentação", "saida"],
      ["Moradia", "saida"],
      ["Saúde", "saida"],
      ["Mobilidade", "saida"],
      ["Lazer", "saida"],
      ["Educação", "saida"],
      ["Outros", "saida"],
    ]) {
      await client.query(
        "INSERT INTO categorias(usuario_id,nome,tipo) VALUES($1,$2,$3)",
        [usuario.id, nomeCategoria, tipo],
      );
    }
    await client.query(
      "INSERT INTO fontes_destinos(usuario_id,nome,tipo) VALUES($1,'Conta corrente','conta')",
      [usuario.id],
    );
    return usuario;
  });
}
export async function porEmail(email) {
  return (
    await pool.query(
      "SELECT id,nome,email,senha_hash FROM usuarios WHERE email=$1",
      [email],
    )
  ).rows[0];
}
export async function porId(id) {
  return (
    await pool.query("SELECT id,nome,email FROM usuarios WHERE id=$1", [id])
  ).rows[0];
}
