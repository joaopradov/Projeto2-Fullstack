import "dotenv/config";
import pg from "pg";
if (!process.env.DATABASE_URL)
  throw new Error("Configure DATABASE_URL no .env.");
// Datas de calendário e dinheiro seguem como strings, evitando conversões implícitas.
pg.types.setTypeParser(1082, (value) => value);
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
pool.on("error", () => console.error("Falha em conexão ociosa do banco."));
