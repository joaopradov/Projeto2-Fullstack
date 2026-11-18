export function tratarErro(erro, req, res, next) {
  if (res.headersSent) return next(erro);
  if (erro.status && erro.status >= 400 && erro.status < 500)
    return res
      .status(erro.status)
      .json({
        erro:
          erro.type === "entity.parse.failed" ? "JSON inválido." : erro.message,
        campos: erro.campos || {},
      });
  if (erro.code === "23505") {
    const campo =
      erro.constraint === "usuarios_email_key"
        ? "email"
        : erro.constraint === "usuarios_cpf_key"
          ? "cpf"
          : "nome";
    return res
      .status(409)
      .json({
        erro: "Registro duplicado.",
        campos: { [campo]: `Já existe um registro com este ${campo}.` },
      });
  }
  if (erro.code === "23503")
    return res
      .status(409)
      .json({
        erro: "Registro vinculado a outros dados. Não é possível excluir ou alterar essa relação.",
        campos: {},
      });
  if (["23514", "23502", "22003", "22007", "22008"].includes(erro.code))
    return res
      .status(400)
      .json({
        erro: "Dados incompatíveis com as regras do banco.",
        campos: {},
      });
  console.error("Falha interna:", erro.code || erro.name);
  res.status(500).json({ erro: "Erro interno do servidor.", campos: {} });
}
