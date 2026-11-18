import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Campo, Erro } from "./Comuns";
export function Auth({ cadastro = false }) {
  const auth = useAuth();
  const [erro, setErro] = useState(null),
    [enviando, setEnviando] = useState(false);
  if (auth.usuario) return <Navigate to="/" replace />;
  async function enviar(e) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const body = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await (cadastro ? auth.cadastrar : auth.login)(body);
    } catch (e) {
      setErro(e);
    } finally {
      setEnviando(false);
    }
  }
  return (
    <main className="auth">
      <section className="auth-texto">
        <span className="marca">◉ Meu balanço</span>
        <h1>
          Seu dinheiro,
          <br />
          mais claro.
        </h1>
        <p>
          Organize o presente e acompanhe os compromissos dos próximos meses.
        </p>
        <small>Projeto de Programação Web Full Stack</small>
      </section>
      <section className="auth-form">
        <h2>{cadastro ? "Crie sua conta" : "Bem-vindo de volta"}</h2>
        <p>
          {cadastro
            ? "Comece com categorias prontas para usar."
            : "Entre para acompanhar suas finanças."}
        </p>
        <Erro erro={erro} />
        <form onSubmit={enviar}>
          {cadastro && (
            <Campo
              nome="nome"
              label="Nome"
              required
              maxLength={120}
              autoComplete="name"
              erros={erro?.campos}
            />
          )}
          <Campo
            nome="email"
            label="E-mail"
            type="email"
            required
            maxLength={160}
            autoComplete="email"
            erros={erro?.campos}
          />
          {cadastro && (
            <Campo
              nome="cpf"
              label="CPF"
              required
              maxLength={14}
              placeholder="000.000.000-00"
              erros={erro?.campos}
            />
          )}
          <Campo
            nome="senha"
            label="Senha"
            type="password"
            required
            minLength={cadastro ? 8 : undefined}
            autoComplete={cadastro ? "new-password" : "current-password"}
            erros={erro?.campos}
          />
          {cadastro && (
            <>
              <small>Use pelo menos 8 caracteres, com letras e números.</small>
              <Campo
                nome="confirmacaoSenha"
                label="Confirme a senha"
                type="password"
                required
                autoComplete="new-password"
                erros={erro?.campos}
              />
            </>
          )}
          <button disabled={enviando}>
            {enviando ? "Aguarde…" : cadastro ? "Criar conta" : "Entrar"}
          </button>
        </form>
        <p>
          {cadastro ? "Já tem conta?" : "Primeira vez aqui?"}{" "}
          <Link to={cadastro ? "/login" : "/cadastro"}>
            {cadastro ? "Entrar" : "Cadastre-se"}
          </Link>
        </p>
      </section>
    </main>
  );
}
