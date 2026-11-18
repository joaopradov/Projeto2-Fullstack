import React, { useState } from "react";
import { api } from "../services/api";
import {
  Campo,
  Erro,
  Estado,
  useDados,
  moeda,
  dataBR,
  hoje,
  mesAtual,
  Periodo,
  Totais,
} from "./Comuns";
export function Lancamentos() {
  const vazio = {
    tipo: "saida",
    descricao: "",
    valor: "",
    data: hoje(),
    categoriaId: "",
    fonteDestinoId: "",
    totalParcelas: 1,
  };
  const [form, setForm] = useState(vazio),
    [id, setId] = useState(null),
    [versao, setVersao] = useState(0),
    [erro, setErro] = useState(null),
    [enviando, setEnviando] = useState(false),
    [filtros, setFiltros] = useState({
      ...mesAtual(),
      tipo: "",
      categoriaId: "",
      fonteDestinoId: "",
      pagina: 1,
    }),
    [exclusao, setExclusao] = useState(null);
  const categorias = useDados("/api/categorias"),
    fontes = useDados("/api/fontes-destinos");
  const recurso = useDados(
    "/api/lancamentos?" + new URLSearchParams(filtros),
    versao,
  );
  const mudar = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  function limpar() {
    setId(null);
    setForm(vazio);
    setErro(null);
  }
  async function salvar(e) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api("/api/lancamentos" + (id ? "/" + id : ""), {
        method: id ? "PUT" : "POST",
        body: form,
      });
      limpar();
      setVersao((v) => v + 1);
    } catch (e) {
      setErro(e);
    } finally {
      setEnviando(false);
    }
  }
  async function excluir(todas) {
    setEnviando(true);
    try {
      await api(`/api/lancamentos/${exclusao.id}?todasParcelas=${todas}`, {
        method: "DELETE",
      });
      setExclusao(null);
      setVersao((v) => v + 1);
    } catch (e) {
      setErro(e);
      setExclusao(null);
    } finally {
      setEnviando(false);
    }
  }
  const cartao =
    fontes.dados?.find((f) => f.id === Number(form.fonteDestinoId))?.tipo ===
    "cartao_credito";
  return (
    <>
      <header className="titulo">
        <div>
          <span className="sobretitulo">Dia a dia</span>
          <h1>Lançamentos</h1>
          <p>Registre entradas, saídas e compras parceladas.</p>
        </div>
      </header>
      <section className="painel">
        <h2>{id ? "Editar parcela / lançamento" : "Novo lançamento"}</h2>
        <Erro erro={erro} />
        <Erro erro={categorias.erro} />
        <Erro erro={fontes.erro} />
        <form onSubmit={salvar} className="form-grid">
          <Campo
            nome="descricao"
            label="Descrição"
            required
            maxLength={120}
            value={form.descricao}
            onChange={mudar}
            erros={erro?.campos}
          />
          <Campo nome="tipo" label="Tipo" erros={erro?.campos}>
            <select
              name="tipo"
              value={form.tipo}
              onChange={(e) =>
                setForm({ ...form, tipo: e.target.value, categoriaId: "" })
              }
            >
              <option value="saida">Saída</option>
              <option value="entrada">Entrada</option>
            </select>
          </Campo>
          <Campo
            nome="valor"
            label={id ? "Valor desta parcela (R$)" : "Valor total (R$)"}
            type="number"
            min="0.01"
            max="9999999999.99"
            step="0.01"
            required
            value={form.valor}
            onChange={mudar}
            erros={erro?.campos}
          />
          <Campo
            nome="data"
            label="Data da compra / movimentação"
            type="date"
            required
            value={form.data}
            onChange={mudar}
            erros={erro?.campos}
          />
          <Campo nome="categoriaId" label="Categoria" erros={erro?.campos}>
            <select
              name="categoriaId"
              required
              value={form.categoriaId}
              onChange={mudar}
            >
              <option value="">Selecione</option>
              {categorias.dados
                ?.filter((c) => c.tipo === form.tipo)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
            </select>
          </Campo>
          <Campo
            nome="fonteDestinoId"
            label="Fonte / destino"
            erros={erro?.campos}
          >
            <select
              name="fonteDestinoId"
              required
              value={form.fonteDestinoId}
              onChange={(e) =>
                setForm({
                  ...form,
                  fonteDestinoId: e.target.value,
                  totalParcelas: id ? form.totalParcelas : 1,
                })
              }
            >
              <option value="">Selecione</option>
              {fontes.dados?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </Campo>
          {cartao && (
            <Campo
              nome="totalParcelas"
              label="Número de parcelas"
              type="number"
              min="1"
              max="48"
              readOnly={!!id}
              required
              value={form.totalParcelas}
              onChange={mudar}
              erros={erro?.campos}
            />
          )}
          <div className="acoes">
            <button
              disabled={enviando || categorias.carregando || fontes.carregando}
            >
              {enviando ? "Salvando…" : "Salvar lançamento"}
            </button>
            {id && (
              <button type="button" className="secundario" onClick={limpar}>
                Cancelar
              </button>
            )}
          </div>
        </form>
        {id && (
          <small>
            A edição altera somente este lançamento. Em compras parceladas,
            mantenha cartão, data original e número de parcelas.
          </small>
        )}
        {cartao && (
          <p className="nota">
            Compras no cartão entram no período do vencimento da parcela. No dia
            do fechamento, a compra passa à próxima fatura.
          </p>
        )}
      </section>
      <section className="painel">
        <h2>Movimentações</h2>
        <Periodo
          valor={filtros}
          onChange={(v) => setFiltros({ ...v, pagina: 1 })}
        />
        <div className="filtros">
          <Campo nome="filtroTipo" label="Tipo">
            <select
              value={filtros.tipo}
              onChange={(e) =>
                setFiltros({ ...filtros, tipo: e.target.value, pagina: 1 })
              }
            >
              <option value="">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
          </Campo>
          <Campo nome="filtroCategoria" label="Categoria">
            <select
              value={filtros.categoriaId}
              onChange={(e) =>
                setFiltros({
                  ...filtros,
                  categoriaId: e.target.value,
                  pagina: 1,
                })
              }
            >
              <option value="">Todas</option>
              {categorias.dados?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.tipo})
                </option>
              ))}
            </select>
          </Campo>
          <Campo nome="filtroFonte" label="Fonte / destino">
            <select
              value={filtros.fonteDestinoId}
              onChange={(e) =>
                setFiltros({
                  ...filtros,
                  fonteDestinoId: e.target.value,
                  pagina: 1,
                })
              }
            >
              <option value="">Todas</option>
              {fontes.dados?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Estado recurso={recurso}>
          {recurso.dados && (
            <>
              <Totais totais={recurso.dados.totais} />
              {!recurso.dados.itens.length ? (
                <p>Nenhum lançamento neste período.</p>
              ) : (
                <div className="tabela">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th>Categoria / destino</th>
                        <th>Valor</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recurso.dados.itens.map((l) => (
                        <tr key={l.id}>
                          <td>{dataBR(l.data)}</td>
                          <td>
                            {l.descricao}
                            <small>
                              {l.total_parcelas > 1
                                ? `Parcela ${l.parcela_atual}/${l.total_parcelas}`
                                : l.tipo}
                            </small>
                          </td>
                          <td>
                            {l.categoria}
                            <small>{l.fonte_destino}</small>
                          </td>
                          <td
                            className={l.tipo === "entrada" ? "positivo" : ""}
                          >
                            {l.tipo === "entrada" ? "+" : "−"} {moeda(l.valor)}
                          </td>
                          <td className="acoes">
                            <button
                              className="texto"
                              onClick={() => {
                                setId(l.id);
                                setForm({
                                  tipo: l.tipo,
                                  descricao: l.descricao,
                                  valor: l.valor,
                                  data: l.data_compra || l.data,
                                  categoriaId: l.categoria_id,
                                  fonteDestinoId: l.fonte_destino_id,
                                  totalParcelas: l.total_parcelas,
                                });
                                setErro(null);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                            >
                              Editar
                            </button>
                            <button
                              className="texto perigo"
                              onClick={() => setExclusao(l)}
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="paginacao">
                <button
                  className="secundario"
                  disabled={filtros.pagina === 1}
                  onClick={() =>
                    setFiltros({ ...filtros, pagina: filtros.pagina - 1 })
                  }
                >
                  Anterior
                </button>
                <span>
                  Página {recurso.dados.pagina} de {recurso.dados.paginas}
                </span>
                <button
                  className="secundario"
                  disabled={filtros.pagina >= recurso.dados.paginas}
                  onClick={() =>
                    setFiltros({ ...filtros, pagina: filtros.pagina + 1 })
                  }
                >
                  Próxima
                </button>
              </div>
            </>
          )}
        </Estado>
      </section>
      {exclusao && (
        <div className="modal-fundo">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="excluir-titulo"
          >
            <h2 id="excluir-titulo">Excluir {exclusao.descricao}?</h2>
            <p>Esta ação não pode ser desfeita.</p>
            <div className="acoes">
              <button disabled={enviando} onClick={() => excluir(false)}>
                Excluir somente este
              </button>
              {exclusao.total_parcelas > 1 && (
                <button
                  disabled={enviando}
                  className="perigo"
                  onClick={() => excluir(true)}
                >
                  Excluir todas as parcelas
                </button>
              )}
              <button
                disabled={enviando}
                className="secundario"
                onClick={() => setExclusao(null)}
              >
                Cancelar
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
