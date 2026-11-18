import { transacao } from "./transacao.js";
import { pool } from "../config/database.js";
import { texto, exigir, inteiro, centavos, decimal, falha } from "./regras.js";
// Somente nomes definidos pelo programa entram na interpolação de SQL.
const tabelas = { categorias: "categorias", fontes: "fontes_destinos" };
export async function listar(entidade, usuarioId) {
  return (
    await pool.query(
      `SELECT * FROM ${tabelas[entidade]} WHERE usuario_id=$1 ORDER BY nome,id`,
      [usuarioId],
    )
  ).rows;
}
export async function salvar(entidade, usuarioId, id, body) {
  return transacao(async (client) => {
    const nome = texto(body.nome, "nome", 60);
    if (id) inteiro(id, "id");
    if (entidade === "categorias") {
      exigir(
        ["entrada", "saida"].includes(body.tipo),
        "tipo",
        "Selecione entrada ou saída.",
      );
      const sql = id
        ? "UPDATE categorias SET nome=$1,tipo=$2 WHERE usuario_id=$3 AND id=$4 RETURNING *"
        : "INSERT INTO categorias(nome,tipo,usuario_id) VALUES($1,$2,$3) RETURNING *";
      const r = await client.query(
        sql,
        id ? [nome, body.tipo, usuarioId, id] : [nome, body.tipo, usuarioId],
      );
      if (!r.rows[0]) throw falha(404, "Categoria não encontrada.");
      return r.rows[0];
    }
    exigir(
      ["renda", "conta", "cartao_credito"].includes(body.tipo),
      "tipo",
      "Tipo inválido.",
    );
    const cartao = body.tipo === "cartao_credito";
    const fechamento = cartao
      ? inteiro(body.diaFechamento, "diaFechamento", 1, 31)
      : null;
    const vencimento = cartao
      ? inteiro(body.diaVencimento, "diaVencimento", 1, 31)
      : null;
    const limite = cartao
      ? decimal(centavos(body.limite, "limite", true))
      : null;
    if (id) {
      const atual = (
        await client.query(
          "SELECT * FROM fontes_destinos WHERE id=$1 AND usuario_id=$2 FOR UPDATE",
          [id, usuarioId],
        )
      ).rows[0];
      if (!atual) throw falha(404, "Fonte/destino não encontrado.");
      if (
        atual.tipo !== body.tipo ||
        atual.dia_fechamento !== fechamento ||
        atual.dia_vencimento !== vencimento
      ) {
        const vinculos = await client.query(
          "SELECT 1 FROM lancamentos WHERE usuario_id=$1 AND fonte_destino_id=$2 LIMIT 1",
          [usuarioId, id],
        );
        if (vinculos.rowCount)
          throw falha(
            409,
            "Com lançamentos vinculados, altere apenas nome ou limite. Crie outro cartão para um novo ciclo.",
          );
      }
    }
    const valores = [
      nome,
      body.tipo,
      fechamento,
      vencimento,
      limite,
      usuarioId,
    ];
    const sql = id
      ? "UPDATE fontes_destinos SET nome=$1,tipo=$2,dia_fechamento=$3,dia_vencimento=$4,limite=$5 WHERE usuario_id=$6 AND id=$7 RETURNING *"
      : "INSERT INTO fontes_destinos(nome,tipo,dia_fechamento,dia_vencimento,limite,usuario_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *";
    const r = await client.query(sql, id ? [...valores, id] : valores);
    if (!r.rows[0]) throw falha(404, "Fonte/destino não encontrado.");
    return r.rows[0];
  });
}

export async function excluir(entidade, usuarioId, id) {
  inteiro(id, "id");
  const r = await pool.query(
    `DELETE FROM ${tabelas[entidade]} WHERE usuario_id=$1 AND id=$2`,
    [usuarioId, id],
  );
  if (!r.rowCount) throw falha(404, "Registro não encontrado.");
}
