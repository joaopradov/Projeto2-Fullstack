import React, { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  Estado,
  useDados,
  moeda,
  dataBR,
  mesAtual,
  Periodo,
  Totais,
} from "./Comuns";
export function Grafico({
  dados,
  chaves = [["total", "Saídas"]],
  linha = false,
}) {
  const Chart = linha ? LineChart : BarChart;
  return (
    <div className="grafico">
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={dados}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => moeda(v)} />
          <Legend />
          {chaves.map(([chave, nome], i) =>
            linha ? (
              <Line
                key={chave}
                type="monotone"
                dataKey={chave}
                name={nome}
                stroke="#147d64"
                strokeWidth={3}
              />
            ) : (
              <Bar
                key={chave}
                dataKey={chave}
                name={nome}
                fill={i ? "#e9ae66" : "#147d64"}
                radius={[4, 4, 0, 0]}
              />
            ),
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
export function Dashboard() {
  const periodo = mesAtual();
  const recurso = useDados("/api/lancamentos?" + new URLSearchParams(periodo));
  const categorias = useDados(
    "/api/relatorios/categorias?" + new URLSearchParams(periodo),
  );
  return (
    <>
      <header className="titulo">
        <div>
          <span className="sobretitulo">Seu panorama</span>
          <h1>Uma visão do seu mês</h1>
          <p>
            {dataBR(periodo.inicio)} a {dataBR(periodo.fim)}
          </p>
        </div>
        <span className="selo">Controle financeiro pessoal</span>
      </header>
      <Estado recurso={recurso}>
        {recurso.dados && <Totais totais={recurso.dados.totais} />}
      </Estado>
      <div className="duas-colunas iguais">
        <section className="painel">
          <h2>Saídas por categoria</h2>
          <Estado recurso={categorias}>
            {categorias.dados && Number(categorias.dados.totalSaidas) > 0 ? (
              <Grafico
                dados={categorias.dados.itens
                  .filter((c) => c.tipo === "saida")
                  .map((c) => ({ ...c, total: Number(c.total) }))}
              />
            ) : (
              <p>Suas despesas aparecerão aqui.</p>
            )}
          </Estado>
        </section>
        <section className="painel">
          <h2>Últimas movimentações</h2>
          <Estado recurso={recurso}>
            {recurso.dados?.itens.length ? (
              recurso.dados.itens.slice(0, 6).map((l) => (
                <div className="movimento" key={l.id}>
                  <div>
                    <strong>{l.descricao}</strong>
                    <small>
                      {dataBR(l.data)} · {l.categoria}
                    </small>
                  </div>
                  <strong className={l.tipo === "entrada" ? "positivo" : ""}>
                    {l.tipo === "entrada" ? "+" : "−"} {moeda(l.valor)}
                  </strong>
                </div>
              ))
            ) : (
              <p>Comece registrando um lançamento.</p>
            )}
          </Estado>
        </section>
      </div>
      <p className="nota">
        O saldo considera os registros do período. Compras no cartão aparecem no
        vencimento; não registre novamente o pagamento da fatura como despesa.
      </p>
    </>
  );
}
export function Relatorios() {
  const [periodo, setPeriodo] = useState(mesAtual);
  const query = new URLSearchParams(periodo);
  const categorias = useDados("/api/relatorios/categorias?" + query);
  const fontes = useDados("/api/relatorios/fontes-destinos?" + query);
  return (
    <>
      <header className="titulo">
        <div>
          <span className="sobretitulo">Entenda seus hábitos</span>
          <h1>Relatórios</h1>
          <p>Totais calculados no servidor para o período completo.</p>
        </div>
      </header>
      <Periodo valor={periodo} onChange={setPeriodo} />
      <section className="painel">
        <h2>Por categoria</h2>
        <Estado recurso={categorias}>
          {categorias.dados && (
            <>
              <p>
                Comparação: {dataBR(categorias.dados.periodoAnterior.inicio)} a{" "}
                {dataBR(categorias.dados.periodoAnterior.fim)}
              </p>
              {Number(categorias.dados.totalSaidas) > 0 ? (
                <Grafico
                  dados={categorias.dados.itens
                    .filter((c) => c.tipo === "saida")
                    .map((c) => ({ ...c, total: Number(c.total) }))}
                />
              ) : (
                <p>Sem saídas no período.</p>
              )}
              <div className="tabela">
                <table>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Tipo</th>
                      <th>Total</th>
                      <th>% das saídas</th>
                      <th>Anterior</th>
                      <th>Variação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorias.dados.itens.map((c) => (
                      <tr key={c.id}>
                        <td>{c.nome}</td>
                        <td>{c.tipo}</td>
                        <td>{moeda(c.total)}</td>
                        <td>
                          {c.tipo === "saida"
                            ? c.percentual.toFixed(1) + "%"
                            : "—"}
                        </td>
                        <td>{moeda(c.anterior)}</td>
                        <td>
                          {c.variacao === null
                            ? "Sem base anterior"
                            : c.variacao.toFixed(1) + "%"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Estado>
      </section>
      <section className="painel">
        <h2>Por fonte e destino</h2>
        <Estado recurso={fontes}>
          {fontes.dados && (
            <>
              {fontes.dados.itens.length ? (
                <>
                  <Grafico
                    dados={fontes.dados.itens.map((f) => ({
                      ...f,
                      entradas: Number(f.entradas),
                      saidas: Number(f.saidas),
                    }))}
                    chaves={[
                      ["entradas", "Entradas"],
                      ["saidas", "Saídas"],
                    ]}
                  />
                  <div className="tabela">
                    <table>
                      <thead>
                        <tr>
                          <th>Fonte / destino</th>
                          <th>Entradas</th>
                          <th>Saídas</th>
                          <th>Saldo da conta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fontes.dados.itens.map((f) => (
                          <tr key={f.id}>
                            <td>{f.nome}</td>
                            <td>{moeda(f.entradas)}</td>
                            <td>{moeda(f.saidas)}</td>
                            <td>{f.tipo === "conta" ? moeda(f.saldo) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p>Cadastre uma fonte ou destino para começar.</p>
              )}
            </>
          )}
        </Estado>
      </section>
    </>
  );
}
export function Faturas() {
  const recurso = useDados("/api/relatorios/faturas?meses=3");
  return (
    <>
      <header className="titulo">
        <div>
          <span className="sobretitulo">Planeje os próximos meses</span>
          <h1>Faturas dos cartões</h1>
          <p>
            Fatura aberta e as próximas três. O limite inclui todas as parcelas
            ainda não vencidas.
          </p>
        </div>
      </header>
      <Estado recurso={recurso}>
        {recurso.dados?.length ? (
          recurso.dados.map((c) => (
            <section key={c.id} className="painel">
              <h2>{c.nome}</h2>
              <div className="cards">
                <article>
                  <span>Limite total</span>
                  <strong>{moeda(c.limite)}</strong>
                </article>
                <article>
                  <span>Comprometido</span>
                  <strong>{moeda(c.limiteUtilizado)}</strong>
                </article>
                <article>
                  <span>Disponível</span>
                  <strong
                    className={
                      Number(c.limiteDisponivel) < 0 ? "negativo" : "positivo"
                    }
                  >
                    {moeda(c.limiteDisponivel)}
                  </strong>
                </article>
              </div>
              <div className="faturas">
                {c.faturas.map((f, i) => (
                  <article className="fatura" key={f.fechamento}>
                    <span className="sobretitulo">
                      {i === 0 ? "Aberta" : "Próxima " + i}
                    </span>
                    <h3>{f.referencia.split("-").reverse().join("/")}</h3>
                    <strong className="valor-fatura">{moeda(f.total)}</strong>
                    <small>
                      Fecha {dataBR(f.fechamento)}
                      <br />
                      Vence {dataBR(f.vencimento)}
                    </small>
                    {f.itens.length ? (
                      <ul>
                        {f.itens.map((l) => (
                          <li key={l.id}>
                            {l.descricao} · {l.parcela_atual}/{l.total_parcelas}
                            <strong>{moeda(l.valor)}</strong>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>Sem compras previstas.</p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))
        ) : (
          <section className="painel">
            <p>
              Cadastre um cartão em Fontes e destinos para ver suas faturas.
            </p>
          </section>
        )}
      </Estado>
    </>
  );
}
export function Saude() {
  const recurso = useDados("/api/saude-financeira");
  return (
    <>
      <header className="titulo">
        <div>
          <span className="sobretitulo">Desafio extra</span>
          <h1>Saúde financeira</h1>
          <p>Uma leitura educativa dos seus registros.</p>
        </div>
      </header>
      <Estado recurso={recurso}>
        {recurso.dados && (
          <>
            <p className="aviso">{recurso.dados.aviso}</p>
            <p>
              Base: {dataBR(recurso.dados.periodo.inicio)} a{" "}
              {dataBR(recurso.dados.periodo.fim)}. Meses sem registros entram
              como zero.
            </p>
            <div className="cards">
              <article>
                <span>Renda média mensal</span>
                <strong>{moeda(recurso.dados.indicadores.rendaMedia)}</strong>
              </article>
              <article>
                <span>Taxa de poupança</span>
                <strong>
                  {recurso.dados.indicadores.taxaPoupanca === null
                    ? "Sem renda"
                    : recurso.dados.indicadores.taxaPoupanca.toFixed(1) + "%"}
                </strong>
              </article>
              <article>
                <span>Parcelas futuras / renda média</span>
                <strong>
                  {recurso.dados.indicadores.comprometimentoCartoes === null
                    ? "Sem renda"
                    : recurso.dados.indicadores.comprometimentoCartoes.toFixed(
                        1,
                      ) + "%"}
                </strong>
              </article>
            </div>
            <section className="painel">
              <h2>Projeção do saldo registrado</h2>
              <Grafico
                linha
                dados={recurso.dados.projecao.map((p) => ({
                  ...p,
                  nome: p.mes.split("-").reverse().join("/"),
                }))}
                chaves={[["saldo", "Saldo projetado"]]}
              />
              <p className="nota">{recurso.dados.premissa}</p>
            </section>
            <section className="painel">
              <h2>Pontos de atenção</h2>
              <ul>
                {recurso.dados.dicas.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </section>
          </>
        )}
      </Estado>
    </>
  );
}
