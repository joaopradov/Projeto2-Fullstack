import { randomUUID } from "node:crypto";
import { pool } from "../config/database.js";
import { transacao } from "./transacao.js";
import {
  texto,
  exigir,
  inteiro,
  centavos,
  decimal,
  dataValida,
  calcularFatura,
  dividirParcelas,
  periodo,
  falha,
} from "./regras.js";

async function validar(client, usuarioId, body) {
  const descricao = texto(body.descricao, "descricao", 120);
  exigir(["entrada", "saida"].includes(body.tipo), "tipo", "Tipo inválido.");
  const valor = centavos(body.valor);
  const data = dataValida(body.data);
  const categoriaId = inteiro(body.categoriaId, "categoriaId");
  const fonteDestinoId = inteiro(body.fonteDestinoId, "fonteDestinoId");
  const categoria = (
    await client.query(
      "SELECT * FROM categorias WHERE id=$1 AND usuario_id=$2 FOR SHARE",
      [categoriaId, usuarioId],
    )
  ).rows[0];
  const fonte = (
    await client.query(
      "SELECT * FROM fontes_destinos WHERE id=$1 AND usuario_id=$2 FOR SHARE",
      [fonteDestinoId, usuarioId],
    )
  ).rows[0];
  if (!categoria || !fonte)
    throw falha(404, "Categoria ou fonte/destino não encontrado.");
  exigir(
    categoria.tipo === body.tipo,
    "categoriaId",
    "Categoria incompatível com o tipo do lançamento.",
  );
  exigir(
    fonte.tipo !== "cartao_credito" || body.tipo === "saida",
    "tipo",
    "Cartão de crédito aceita somente saídas.",
  );
  const totalParcelas = inteiro(
    body.totalParcelas ?? 1,
    "totalParcelas",
    1,
    48,
  );
  exigir(
    totalParcelas === 1 || fonte.tipo === "cartao_credito",
    "totalParcelas",
    "Parcelamento disponível somente em cartão de crédito.",
  );
  return {
    descricao,
    tipo: body.tipo,
    valor,
    data,
    categoriaId,
    fonteDestinoId,
    fonte,
    totalParcelas,
  };
}
export async function criar(usuarioId, body) {
  return transacao(async (client) => {
    const d = await validar(client, usuarioId, body);
    const valores = dividirParcelas(d.valor, d.totalParcelas);
    const grupo = randomUUID();
    const resultado = [];
    for (let i = 0; i < valores.length; i++) {
      const fatura =
        d.fonte.tipo === "cartao_credito"
          ? calcularFatura(
              d.data,
              d.fonte.dia_fechamento,
              d.fonte.dia_vencimento,
              i + 1,
            )
          : null;
      const {
        rows: [linha],
      } = await client.query(
        `INSERT INTO lancamentos(usuario_id,tipo,descricao,valor,data,categoria_id,fonte_destino_id,parcela_atual,total_parcelas,grupo_parcelamento,data_compra,data_fechamento_fatura)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [
          usuarioId,
          d.tipo,
          d.descricao,
          decimal(valores[i]),
          fatura?.vencimento || d.data,
          d.categoriaId,
          d.fonteDestinoId,
          i + 1,
          d.totalParcelas,
          grupo,
          d.data,
          fatura?.fechamento || null,
        ],
      );
      resultado.push(linha);
    }
    return resultado;
  });
}
export async function detalhar(usuarioId, id) {
  inteiro(id, "id");
  const linha = (
    await pool.query(
      "SELECT * FROM lancamentos WHERE usuario_id=$1 AND id=$2",
      [usuarioId, id],
    )
  ).rows[0];
  if (!linha) throw falha(404, "Lançamento não encontrado.");
  return linha;
}
export async function atualizar(usuarioId, id, body) {
  inteiro(id, "id");
  return transacao(async (client) => {
    const atual = (
      await client.query(
        "SELECT * FROM lancamentos WHERE usuario_id=$1 AND id=$2 FOR UPDATE",
        [usuarioId, id],
      )
    ).rows[0];
    if (!atual) throw falha(404, "Lançamento não encontrado.");
    const d = await validar(client, usuarioId, body);
    exigir(
      d.totalParcelas === atual.total_parcelas,
      "totalParcelas",
      "Não altere o número de parcelas; exclua o grupo e cadastre novamente.",
    );
    // PUT edita uma parcela. Valor passa a ser o valor desta parcela, não da compra.
    if (atual.total_parcelas > 1) {
      exigir(
        d.fonteDestinoId === atual.fonte_destino_id,
        "fonteDestinoId",
        "Mantenha o cartão do grupo.",
      );
      exigir(
        d.data === atual.data_compra,
        "data",
        "Mantenha a data da compra do grupo.",
      );
    }
    const fatura =
      d.fonte.tipo === "cartao_credito"
        ? calcularFatura(
            d.data,
            d.fonte.dia_fechamento,
            d.fonte.dia_vencimento,
            atual.parcela_atual,
          )
        : null;
    return (
      await client.query(
        `UPDATE lancamentos SET tipo=$1,descricao=$2,valor=$3,data=$4,categoria_id=$5,fonte_destino_id=$6,data_compra=$7,data_fechamento_fatura=$8 WHERE usuario_id=$9 AND id=$10 RETURNING *`,
        [
          d.tipo,
          d.descricao,
          decimal(d.valor),
          fatura?.vencimento || d.data,
          d.categoriaId,
          d.fonteDestinoId,
          d.data,
          fatura?.fechamento || null,
          usuarioId,
          id,
        ],
      )
    ).rows[0];
  });
}
export async function excluir(usuarioId, id, todas) {
  inteiro(id, "id");
  exigir(
    todas === undefined || ["true", "false"].includes(todas),
    "todasParcelas",
    "Use true ou false.",
  );
  return transacao(async (client) => {
    const atual = (
      await client.query(
        "SELECT * FROM lancamentos WHERE usuario_id=$1 AND id=$2 FOR UPDATE",
        [usuarioId, id],
      )
    ).rows[0];
    if (!atual) throw falha(404, "Lançamento não encontrado.");
    if (todas === "true" && atual.grupo_parcelamento)
      await client.query(
        "DELETE FROM lancamentos WHERE usuario_id=$1 AND grupo_parcelamento=$2",
        [usuarioId, atual.grupo_parcelamento],
      );
    else
      await client.query(
        "DELETE FROM lancamentos WHERE usuario_id=$1 AND id=$2",
        [usuarioId, id],
      );
  });
}
export async function listar(usuarioId, query) {
  const { inicio, fim } = periodo(query);
  const pagina = inteiro(query.pagina ?? 1, "pagina", 1, 100000);
  const valores = [usuarioId, inicio, fim];
  let where = "l.usuario_id=$1 AND l.data BETWEEN $2 AND $3";
  for (const [chave, coluna] of [
    ["tipo", "tipo"],
    ["categoriaId", "categoria_id"],
    ["fonteDestinoId", "fonte_destino_id"],
  ]) {
    if (query[chave]) {
      if (chave === "tipo")
        exigir(
          ["entrada", "saida"].includes(query[chave]),
          "tipo",
          "Tipo inválido.",
        );
      else inteiro(query[chave], chave);
      valores.push(query[chave]);
      where += ` AND l.${coluna}=$${valores.length}`;
    }
  }
  const totais = (
    await pool.query(
      `SELECT COUNT(*)::int AS quantidade,COALESCE(SUM(valor) FILTER(WHERE tipo='entrada'),0)::text AS entradas,COALESCE(SUM(valor) FILTER(WHERE tipo='saida'),0)::text AS saidas,COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE -valor END),0)::text AS saldo FROM lancamentos l WHERE ${where}`,
      valores,
    )
  ).rows[0];
  const itens = (
    await pool.query(
      `SELECT l.*,c.nome AS categoria,f.nome AS fonte_destino FROM lancamentos l JOIN categorias c ON c.id=l.categoria_id JOIN fontes_destinos f ON f.id=l.fonte_destino_id WHERE ${where} ORDER BY l.data DESC,l.id DESC LIMIT 20 OFFSET $${valores.length + 1}`,
      [...valores, (pagina - 1) * 20],
    )
  ).rows;
  return {
    itens,
    totais,
    pagina,
    paginas: Math.max(1, Math.ceil(totais.quantidade / 20)),
    inicio,
    fim,
  };
}
