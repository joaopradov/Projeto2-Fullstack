import { pool } from "../config/database.js";

export async function verificarBanco() {
  await pool.query("SELECT 1");
}
