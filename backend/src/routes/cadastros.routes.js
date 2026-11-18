import { Router } from "express";
import { listar, salvar, excluir } from "../models/cadastros.model.js";
export function criarRouterCadastros(entidade) {
  const router = Router();
  router.get("/", async (req, res) =>
    res.json(await listar(entidade, req.usuarioId)),
  );
  router.post("/", async (req, res) =>
    res
      .status(201)
      .json(await salvar(entidade, req.usuarioId, null, req.body || {})),
  );
  router.put("/:id", async (req, res) =>
    res.json(
      await salvar(entidade, req.usuarioId, req.params.id, req.body || {}),
    ),
  );
  router.delete("/:id", async (req, res) => {
    await excluir(entidade, req.usuarioId, req.params.id);
    res.sendStatus(204);
  });
  return router;
}
