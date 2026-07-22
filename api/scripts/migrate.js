require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("../src/db");

async function main() {
  const dirMigrations = path.join(__dirname, "..", "migrations");
  const arquivos = fs
    .readdirSync(dirMigrations)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // 001_..., 002_... — a ordem alfabética é a ordem de aplicação

  for (const arquivo of arquivos) {
    const sql = fs.readFileSync(path.join(dirMigrations, arquivo), "utf8");
    console.log(`[migrate] aplicando migrations/${arquivo} ...`);
    await pool.query(sql);
  }

  console.log("[migrate] concluído.");
  await pool.end();
}

main().catch((erro) => {
  console.error("[migrate] falhou:", erro.message);
  process.exit(1);
});
