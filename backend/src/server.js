import "dotenv/config";
import express from "express";
import cors from "cors";
import { pathToFileURL } from "node:url";
import { diagnosticoRouter } from "./routes/diagnostico.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { criarRouterCadastros } from "./routes/cadastros.routes.js";
import { lancamentosRouter } from "./routes/lancamentos.routes.js";
import { relatoriosRouter, saudeRouter } from "./routes/relatorios.routes.js";
import { autenticar } from "./middlewares/autenticar.js";
import { tratarErro } from "./middlewares/tratarErro.js";
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
  throw new Error(
    "Configure JWT_SECRET com pelo menos 32 caracteres aleatórios.",
  );
export const app = express();
app.disable("x-powered-by");
app.use(
  cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }),
);
app.use(express.json({ limit: "32kb" }));
app.use(diagnosticoRouter);
app.use("/api/auth", authRouter);
app.use("/api", autenticar);
app.use("/api/categorias", criarRouterCadastros("categorias"));
app.use("/api/fontes-destinos", criarRouterCadastros("fontes"));
app.use("/api/lancamentos", lancamentosRouter);
app.use("/api/relatorios", relatoriosRouter);
app.use("/api/saude-financeira", saudeRouter);
app.use((req, res) =>
  res.status(404).json({ erro: "Recurso não encontrado.", campos: {} }),
);
app.use(tratarErro);
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  app.listen(Number(process.env.PORT || 3000), "127.0.0.1", () =>
    console.log("API em http://localhost:" + (process.env.PORT || 3000)),
  );
}
