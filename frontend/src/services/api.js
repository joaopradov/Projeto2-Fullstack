const base = import.meta.env.VITE_API_URL || "http://localhost:3000";
export async function api(caminho, { method = "GET", body, signal } = {}) {
  const token = sessionStorage.getItem("financas_token");
  const resposta = await fetch(base + caminho, {
    method,
    signal,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (resposta.status === 204) return null;
  const dados = await resposta.json();
  if (!resposta.ok) {
    if (
      resposta.status === 401 &&
      !["/api/auth/login", "/api/auth/cadastro"].includes(caminho)
    )
      window.dispatchEvent(new Event("sessao-expirada"));
    throw Object.assign(new Error(dados.erro || "Falha na requisição."), {
      campos: dados.campos || {},
    });
  }
  return dados;
}
