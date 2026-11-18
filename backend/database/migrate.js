import "dotenv/config";
import { readFile } from "node:fs/promises";
import { pool } from "../src/config/database.js";
try {
  // O histórico permite executar novamente sem repetir migrações.
  await pool.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations(nome TEXT PRIMARY KEY)",
  );
  for (const nome of ["001_estrutura.sql", "002_faturas.sql"]) {
    const existe = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE nome=$1",
      [nome],
    );
    if (existe.rowCount) continue;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const sql = await readFile(new URL(nome, import.meta.url), "utf8");
      await client.query(
        sql.replace(/^BEGIN;$/gm, "").replace(/^COMMIT;$/gm, ""),
      );
      await client.query("INSERT INTO schema_migrations(nome) VALUES($1)", [
        nome,
      ]);
      await client.query("COMMIT");
      console.log("Aplicada:", nome);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
} finally {
  await pool.end();
}
