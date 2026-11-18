import React, { useEffect, useState } from "react";
import { api } from "../services/api";
export const moeda = (v) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(v || 0),
  );
export const dataBR = (v) =>
  v ? v.slice(0, 10).split("-").reverse().join("/") : "—";
export const hoje = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Belem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function mesAtual() {
  const h = hoje();
  const [a, m] = h.split("-").map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  return { inicio: h.slice(0, 7) + "-01", fim: h.slice(0, 7) + "-" + ultimo };
}
export function useDados(url, versao = 0) {
  const [dados, setDados] = useState(null),
    [erro, setErro] = useState(null),
    [carregando, setCarregando] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setCarregando(true);
    setErro(null);
    api(url, { signal: controller.signal })
      .then(setDados)
      .catch((e) => {
        if (e.name !== "AbortError") setErro(e);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });
    return () => controller.abort();
  }, [url, versao]);
  return { dados, erro, carregando };
}
export function Erro({ erro }) {
  return erro ? (
    <div className="erro" role="alert">
      {erro.message}
    </div>
  ) : null;
}
export function Estado({ recurso, children }) {
  if (recurso.carregando) return <p role="status">Carregando…</p>;
  if (recurso.erro) return <Erro erro={recurso.erro} />;
  return children;
}
export function Campo({ nome, label, erros = {}, children, ...props }) {
  return (
    <label className="campo">
      {label}
      {children || (
        <input name={nome} {...props} aria-invalid={!!erros[nome]} />
      )}
      {erros[nome] && <small className="campo-erro">{erros[nome]}</small>}
    </label>
  );
}
export function Periodo({ valor, onChange }) {
  return (
    <div className="filtros">
      <Campo
        nome="inicio"
        label="De"
        type="date"
        value={valor.inicio}
        onChange={(e) => onChange({ ...valor, inicio: e.target.value })}
      />
      <Campo
        nome="fim"
        label="Até"
        type="date"
        value={valor.fim}
        onChange={(e) => onChange({ ...valor, fim: e.target.value })}
      />
    </div>
  );
}
export function Totais({ totais }) {
  return (
    <div className="cards">
      <article>
        <span>Entradas</span>
        <strong className="positivo">{moeda(totais.entradas)}</strong>
      </article>
      <article>
        <span>Saídas</span>
        <strong>{moeda(totais.saidas)}</strong>
      </article>
      <article>
        <span>Saldo do período</span>
        <strong className={Number(totais.saldo) < 0 ? "negativo" : "positivo"}>
          {moeda(totais.saldo)}
        </strong>
      </article>
    </div>
  );
}
