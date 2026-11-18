import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";
import { cadastrar, porEmail, porId } from "../models/usuario.model.js";
import { exigir, falha, texto } from "../models/regras.js";
import { autenticar } from "../middlewares/autenticar.js";
export const authRouter = Router();
const limitar = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { erro: "Muitas tentativas. Aguarde 15 minutos.", campos: {} },
});
const hashFalso = await bcrypt.hash("senha-inexistente-local", 12);
authRouter.post("/cadastro", limitar, async (req, res) =>
  res.status(201).json(await cadastrar(req.body || {})),
);
authRouter.post("/login", limitar, async (req, res) => {
  const email = texto(req.body?.email, "email", 160).toLowerCase();
  exigir(
    typeof req.body?.senha === "string" && req.body.senha.length <= 200,
    "senha",
    "Informe a senha.",
  );
  const usuario = await porEmail(email);
  const valido = await bcrypt.compare(
    req.body.senha,
    usuario?.senha_hash || hashFalso,
  );
  if (!usuario || !valido) throw falha(401, "E-mail ou senha inválidos.");
  const token = jwt.sign({}, process.env.JWT_SECRET, {
    subject: String(usuario.id),
    expiresIn: "1h",
    algorithm: "HS256",
    issuer: "financas-api",
    audience: "financas-web",
  });
  res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
  });
});
authRouter.get("/me", autenticar, async (req, res) => {
  const usuario = await porId(req.usuarioId);
  if (!usuario) throw falha(401, "Sessão inválida.");
  res.json(usuario);
});
