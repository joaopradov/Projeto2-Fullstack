import { Router } from "express";
import { verificarBanco } from "../models/diagnostico.model.js";

export const diagnosticoRouter = Router();
// Diagnóstico público sem dados pessoais, fora de /api.
diagnosticoRouter.get("/status", async (req, res, next) => {
  try {
    await verificarBanco();
    res.json({ status: "ok" });
  } catch (erro) {
    next(erro);
  }
});
