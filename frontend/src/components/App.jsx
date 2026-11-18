import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { Auth } from "./Auth";
import { Cadastros } from "./Cadastros";
import { Lancamentos } from "./Lancamentos";
import { Dashboard, Relatorios, Faturas, Saude } from "./Relatorios";
import "./estilos.css";
function Layout() {
  const { usuario, carregando, logout } = useAuth();
  if (carregando) return <p className="carregando">Verificando sessão…</p>;
  if (!usuario) return <Navigate to="/login" replace />;
  return (
    <div className="aplicacao">
      <aside>
        <NavLink className="marca" to="/">
          ◉ Meu balanço
        </NavLink>
        <small className="menu-label">SEU ESPAÇO</small>
        <nav>
          {[
            ["/", "Visão geral"],
            ["/lancamentos", "Lançamentos"],
            ["/categorias", "Categorias"],
            ["/fontes-destinos", "Fontes e destinos"],
            ["/relatorios", "Relatórios"],
            ["/faturas", "Faturas"],
            ["/saude-financeira", "Saúde financeira"],
          ].map(([url, nome]) => (
            <NavLink key={url} to={url} end={url === "/"}>
              {nome}
            </NavLink>
          ))}
        </nav>
        <div className="perfil">
          <strong>{usuario.nome}</strong>
          <small>{usuario.email}</small>
          <button className="secundario" onClick={logout}>
            Sair da conta
          </button>
        </div>
      </aside>
      <main className="conteudo">
        <Outlet />
        <footer>Meu balanço · Projeto acadêmico de controle financeiro</footer>
      </main>
    </div>
  );
}
export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/cadastro" element={<Auth cadastro />} />
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="lancamentos" element={<Lancamentos />} />
            <Route path="categorias" element={<Cadastros key="categorias" />} />
            <Route
              path="fontes-destinos"
              element={<Cadastros key="fontes" fontes />}
            />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="faturas" element={<Faturas />} />
            <Route path="saude-financeira" element={<Saude />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
