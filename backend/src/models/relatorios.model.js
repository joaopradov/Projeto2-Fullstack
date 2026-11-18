import { pool } from "../config/database.js";
import {
  periodo,
  periodoAnterior,
  hoje,
  moverMes,
  calcularFatura,
  inteiro,
} from "./regras.js";
export async function categorias(usuarioId, query) {
  const { inicio, fim } = periodo(query);
  const anterior = periodoAnterior(inicio, fim);
  const { rows } = await pool.query(
    `SELECT c.id,c.nome,c.tipo,
    COALESCE(SUM(l.valor) FILTER(WHERE l.data BETWEEN $2 AND $3),0)::text AS total,
    COALESCE(SUM(l.valor) FILTER(WHERE l.data BETWEEN $4 AND $5),0)::text AS anterior
    FROM categorias c LEFT JOIN lancamentos l ON l.categoria_id=c.id AND l.usuario_id=c.usuario_id AND l.data BETWEEN $4 AND $3
    WHERE c.usuario_id=$1 GROUP BY c.id ORDER BY SUM(l.valor) FILTER(WHERE l.data BETWEEN $2 AND $3) DESC NULLS LAST,c.nome`,
    [usuarioId, inicio, fim, anterior.inicio, anterior.fim],
  );
  const totalSaidas = rows
    .filter((x) => x.tipo === "saida")
    .reduce((a, x) => a + Math.round(Number(x.total) * 100), 0);
  return {
    inicio,
    fim,
    periodoAnterior: anterior,
    totalSaidas: (totalSaidas / 100).toFixed(2),
    itens: rows.map((x) => ({
      ...x,
      percentual:
        x.tipo === "saida" && totalSaidas
          ? (Math.round(Number(x.total) * 100) / totalSaidas) * 100
          : 0,
      variacao:
        Number(x.anterior) > 0
          ? (Number(x.total) / Number(x.anterior) - 1) * 100
          : null,
    })),
  };
}
export async function fontes(usuarioId, query) {
  const { inicio, fim } = periodo(query);
  const { rows } = await pool.query(
    `SELECT f.id,f.nome,f.tipo,
    COALESCE(SUM(l.valor) FILTER(WHERE l.tipo='entrada'),0)::text AS entradas,
    COALESCE(SUM(l.valor) FILTER(WHERE l.tipo='saida'),0)::text AS saidas,
    COALESCE(SUM(CASE WHEN l.tipo='entrada' THEN l.valor ELSE -l.valor END),0)::text AS saldo
    FROM fontes_destinos f LEFT JOIN lancamentos l ON l.fonte_destino_id=f.id AND l.usuario_id=f.usuario_id AND l.data BETWEEN $2 AND $3
    WHERE f.usuario_id=$1 GROUP BY f.id ORDER BY f.nome`,
    [usuarioId, inicio, fim],
  );
  return { inicio, fim, itens: rows };
}
export async function faturas(usuarioId, query = {}) {
  const meses = inteiro(query.meses ?? 3, "meses", 3, 24);
  const agora = hoje();
  const cartoes = (
    await pool.query(
      "SELECT * FROM fontes_destinos WHERE usuario_id=$1 AND tipo='cartao_credito' ORDER BY nome",
      [usuarioId],
    )
  ).rows;
  const resultado = [];
  for (const cartao of cartoes) {
    const primeira = calcularFatura(
      agora,
      cartao.dia_fechamento,
      cartao.dia_vencimento,
    );
    const parcelas = (
      await pool.query(
        "SELECT * FROM lancamentos WHERE usuario_id=$1 AND fonte_destino_id=$2 AND data >= $3 ORDER BY data,id",
        [usuarioId, cartao.id, agora],
      )
    ).rows;
    const utilizado = parcelas.reduce(
      (a, l) => a + Math.round(Number(l.valor) * 100),
      0,
    );
    const limite = Math.round(Number(cartao.limite) * 100);
    const previsoes = Array.from({ length: meses + 1 }, (_, i) => {
      const fechamento = moverMes(
        primeira.fechamento,
        i,
        cartao.dia_fechamento,
      );
      const vencimento = moverMes(
        fechamento,
        cartao.dia_vencimento > cartao.dia_fechamento ? 0 : 1,
        cartao.dia_vencimento,
      );
      const itens = parcelas.filter(
        (l) => l.data_fechamento_fatura === fechamento,
      );
      return {
        fechamento,
        vencimento,
        referencia: vencimento.slice(0, 7),
        itens,
        total: (
          itens.reduce((a, l) => a + Math.round(Number(l.valor) * 100), 0) / 100
        ).toFixed(2),
      };
    });
    resultado.push({
      id: cartao.id,
      nome: cartao.nome,
      limite: cartao.limite,
      limiteUtilizado: (utilizado / 100).toFixed(2),
      limiteDisponivel: ((limite - utilizado) / 100).toFixed(2),
      faturas: previsoes,
    });
  }
  return resultado;
}
export async function saude(usuarioId) {
  const agora = hoje();
  const inicio = moverMes(agora, -3, 1);
  const fim = moverMes(agora, -1, 31);
  const {
    rows: [totais],
  } = await pool.query(
    `SELECT COALESCE(SUM(valor) FILTER(WHERE tipo='entrada'),0)::text AS entradas,COALESCE(SUM(valor) FILTER(WHERE tipo='saida'),0)::text AS saidas FROM lancamentos WHERE usuario_id=$1 AND data BETWEEN $2 AND $3`,
    [usuarioId, inicio, fim],
  );
  const entradas = Math.round(Number(totais.entradas) * 100);
  const saidas = Math.round(Number(totais.saidas) * 100);
  const mediaRenda = Math.round(entradas / 3);
  const mediaSaidas = Math.round(saidas / 3);
  const cartoes = await faturas(usuarioId);
  const comprometido = cartoes.reduce(
    (a, c) => a + Math.round(Number(c.limiteUtilizado) * 100),
    0,
  );
  const poupanca = entradas ? ((entradas - saidas) / entradas) * 100 : null;
  const comprometimento = mediaRenda ? (comprometido / mediaRenda) * 100 : null;
  const {
    rows: [saldo],
  } = await pool.query(
    "SELECT COALESCE(SUM(CASE WHEN tipo='entrada' THEN valor ELSE -valor END),0)::text AS valor FROM lancamentos WHERE usuario_id=$1 AND data < $2",
    [usuarioId, moverMes(agora, 0, 1)],
  );
  const base = Math.round(Number(saldo.valor) * 100);
  const projecao = Array.from({ length: 6 }, (_, i) => ({
    mes: moverMes(agora, i, 1).slice(0, 7),
    saldo: (base + (mediaRenda - mediaSaidas) * (i + 1)) / 100,
  }));
  const dicas = [];
  if (!entradas)
    dicas.push(
      "Registre suas receitas: ainda não há base para calcular taxas.",
    );
  if (saidas > entradas)
    dicas.push(
      "As saídas dos últimos três meses superaram as entradas. Revise as categorias com maior gasto.",
    );
  if (poupanca !== null && poupanca < 20)
    dicas.push(
      "Simule uma meta educativa de poupar 20% da renda e ajuste à sua realidade.",
    );
  if (comprometimento !== null && comprometimento > 50)
    dicas.push(
      "As parcelas futuras superam 50% da renda média mensal. Avalie o impacto antes de novas compras.",
    );
  if (!dicas.length)
    dicas.push(
      "Mantenha os registros em dia e acompanhe os compromissos futuros.",
    );
  return {
    periodo: { inicio, fim },
    indicadores: {
      rendaMedia: mediaRenda / 100,
      despesaMedia: mediaSaidas / 100,
      taxaPoupanca: poupanca,
      comprometimentoCartoes: comprometimento,
    },
    projecao,
    dicas,
    premissa:
      "Projeção do saldo registrado: saldo anterior ao mês atual + média mensal de entradas menos saídas dos três meses completos anteriores. Não inclui previsão de inflação ou renda nova; parcelas futuras são mostradas separadamente nas faturas.",
    aviso:
      "Informações educativas; não constituem recomendação financeira profissional.",
  };
}
