import React, { useState } from "react";
import { api } from "../services/api";
import { Campo, Erro, Estado, useDados, moeda } from "./Comuns";
export function Cadastros({ fontes = false }) {
  const caminho = fontes ? "/api/fontes-destinos" : "/api/categorias";
  const vazio = {
    nome: "",
    tipo: fontes ? "conta" : "saida",
    diaFechamento: "",
    diaVencimento: "",
    limite: "",
  };
  const [form, setForm] = useState(vazio),
    [id, setId] = useState(null),
    [versao, setVersao] = useState(0),
    [erro, setErro] = useState(null),
    [enviando, setEnviando] = useState(false);
  const recurso = useDados(caminho, versao);
  const mudar = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  function limpar() {
    setForm(vazio);
    setId(null);
    setErro(null);
  }
  async function salvar(e) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await api(caminho + (id ? "/" + id : ""), {
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
  async function excluir(item) {
    if (
      !confirm(
        `Excluir “${item.nome}”? Registros com lançamentos não podem ser excluídos.`,
      )
    )
      return;
    try {
      await api(caminho + "/" + item.id, { method: "DELETE" });
      setVersao((v) => v + 1);
    } catch (e) {
      setErro(e);
    }
  }
  return (
    <>
      <header className="titulo">
        <div>
          <span className="sobretitulo">Organização</span>
          <h1>{fontes ? "Fontes e destinos" : "Categorias"}</h1>
          <p>
            {fontes
              ? "De onde vem e para onde vai seu dinheiro."
              : "Dê um significado a cada movimentação."}
          </p>
        </div>
      </header>
      <div className="duas-colunas">
        <section className="painel">
          <h2>
            {id ? "Editar" : "Adicionar"}{" "}
            {fontes ? "fonte/destino" : "categoria"}
          </h2>
          <Erro erro={erro} />
          <form onSubmit={salvar}>
            <Campo
              nome="nome"
              label="Nome"
              required
              maxLength={60}
              value={form.nome}
              onChange={mudar}
              erros={erro?.campos}
            />
            <Campo nome="tipo" label="Tipo" erros={erro?.campos}>
              <select name="tipo" value={form.tipo} onChange={mudar}>
                {(fontes
                  ? [
                      ["conta", "Conta"],
                      ["renda", "Renda"],
                      ["cartao_credito", "Cartão de crédito"],
                    ]
                  : [
                      ["saida", "Saída"],
                      ["entrada", "Entrada"],
                    ]
                ).map(([v, n]) => (
                  <option key={v} value={v}>
                    {n}
                  </option>
                ))}
              </select>
            </Campo>
            {fontes && form.tipo === "cartao_credito" && (
              <>
                <Campo
                  nome="diaFechamento"
                  label="Dia de fechamento"
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={form.diaFechamento}
                  onChange={mudar}
                  erros={erro?.campos}
                />
                <Campo
                  nome="diaVencimento"
                  label="Dia de vencimento"
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={form.diaVencimento}
                  onChange={mudar}
                  erros={erro?.campos}
                />
                <Campo
                  nome="limite"
                  label="Limite (R$)"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.limite}
                  onChange={mudar}
                  erros={erro?.campos}
                />
              </>
            )}
            <div className="acoes">
              <button disabled={enviando}>
                {enviando ? "Salvando…" : "Salvar"}
              </button>
              {id && (
                <button type="button" className="secundario" onClick={limpar}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>
        <section className="painel">
          <h2>Seus registros</h2>
          <Estado recurso={recurso}>
            {recurso.dados?.length === 0 ? (
              <p>Nenhum registro. Adicione o primeiro.</p>
            ) : (
              <div className="tabela">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Tipo</th>
                      {fontes && <th>Limite</th>}
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recurso.dados?.map((item) => (
                      <tr key={item.id}>
                        <td>{item.nome}</td>
                        <td>{item.tipo.replaceAll("_", " ")}</td>
                        {fontes && (
                          <td>
                            {item.tipo === "cartao_credito"
                              ? moeda(item.limite)
                              : "—"}
                          </td>
                        )}
                        <td className="acoes">
                          <button
                            className="texto"
                            onClick={() => {
                              setId(item.id);
                              setForm({
                                nome: item.nome,
                                tipo: item.tipo,
                                diaFechamento: item.dia_fechamento ?? "",
                                diaVencimento: item.dia_vencimento ?? "",
                                limite: item.limite ?? "",
                              });
                              setErro(null);
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="texto perigo"
                            onClick={() => excluir(item)}
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
          </Estado>
        </section>
      </div>
    </>
  );
}
