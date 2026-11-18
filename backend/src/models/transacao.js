import { pool } from "../config/database.js";
export async function transacao(executar) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const resultado = await executar(client);
    await client.query("COMMIT");
    return resultado;
  } catch (erro) {
    await client.query("ROLLBACK");
    throw erro;
  } finally {
    client.release();
  }
}
