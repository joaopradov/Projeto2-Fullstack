import jwt from "jsonwebtoken";
export function autenticar(req, res, next) {
  const match = /^Bearer (\S+)$/.exec(req.headers.authorization || "");
  try {
    if (!match) throw new Error();
    const payload = jwt.verify(match[1], process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "financas-api",
      audience: "financas-web",
    });
    if (!/^[1-9]\d*$/.test(payload.sub)) throw new Error();
    req.usuarioId = Number(payload.sub);
    next();
  } catch {
    res
      .status(401)
      .json({ erro: "Token ausente, inválido ou expirado.", campos: {} });
  }
}
