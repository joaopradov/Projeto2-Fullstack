import { Router } from "express";
import * as model from "../models/lancamentos.model.js";
export const lancamentosRouter = Router();
lancamentosRouter.get("/", async (req, res) =>
  res.json(await model.listar(req.usuarioId, req.query)),
);
lancamentosRouter.post("/", async (req, res) =>
  res.status(201).json(await model.criar(req.usuarioId, req.body || {})),
);
lancamentosRouter.get("/:id", async (req, res) =>
  res.json(await model.detalhar(req.usuarioId, req.params.id)),
);
lancamentosRouter.put("/:id", async (req, res) =>
  res.json(await model.atualizar(req.usuarioId, req.params.id, req.body || {})),
);
lancamentosRouter.delete("/:id", async (req, res) => {
  await model.excluir(req.usuarioId, req.params.id, req.query.todasParcelas);
  res.sendStatus(204);
});
