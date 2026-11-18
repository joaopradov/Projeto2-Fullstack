import { Router } from "express";
import * as model from "../models/relatorios.model.js";
export const relatoriosRouter = Router();
relatoriosRouter.get("/categorias", async (req, res) =>
  res.json(await model.categorias(req.usuarioId, req.query)),
);
relatoriosRouter.get("/fontes-destinos", async (req, res) =>
  res.json(await model.fontes(req.usuarioId, req.query)),
);
relatoriosRouter.get("/faturas", async (req, res) =>
  res.json(await model.faturas(req.usuarioId, req.query)),
);
export const saudeRouter = Router();
saudeRouter.get("/", async (req, res) =>
  res.json(await model.saude(req.usuarioId)),
);
