import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(() =>
    sessionStorage.getItem("financas_token"),
  );
  const [carregando, setCarregando] = useState(true);
  function logout() {
    sessionStorage.removeItem("financas_token");
    setToken(null);
    setUsuario(null);
  }
  useEffect(() => {
    window.addEventListener("sessao-expirada", logout);
    if (sessionStorage.getItem("financas_token"))
      api("/api/auth/me")
        .then(setUsuario)
        .catch(logout)
        .finally(() => setCarregando(false));
    else setCarregando(false);
    return () => window.removeEventListener("sessao-expirada", logout);
  }, []);
  // O servidor valida a assinatura; aqui o exp apenas agenda a saída da interface.
  useEffect(() => {
    if (!token) return;
    try {
      const payload = JSON.parse(
        atob(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
      );
      const restante = payload.exp * 1000 - Date.now();
      if (!Number.isFinite(restante) || restante <= 0) {
        logout();
        return;
      }
      const timer = setTimeout(logout, restante);
      return () => clearTimeout(timer);
    } catch {
      logout();
    }
  }, [token]);
  async function login(dados) {
    const r = await api("/api/auth/login", { method: "POST", body: dados });
    sessionStorage.setItem("financas_token", r.token);
    setToken(r.token);
    setUsuario(r.usuario);
  }
  async function cadastrar(dados) {
    await api("/api/auth/cadastro", { method: "POST", body: dados });
    await login({ email: dados.email, senha: dados.senha });
  }
  return (
    <AuthContext.Provider
      value={{ usuario, token, carregando, login, logout, cadastrar }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
