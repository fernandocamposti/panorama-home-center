// Cria o primeiro usuário admin (não existe cadastro público, de propósito).
// Uso:
//   node scripts/create-admin.js "Seu Nome" seu@email.com "senha-forte"

require("dotenv").config();
const bcrypt = require("bcryptjs");
const { pool } = require("../src/db");

async function main() {
  const [nome, email, senha] = process.argv.slice(2);

  if (!nome || !email || !senha) {
    console.error("Uso: node scripts/create-admin.js \"Nome\" email@dominio.com senha");
    process.exit(1);
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const { rows } = await pool.query(
    `INSERT INTO usuarios_ti (nome, email, senha_hash, perfil)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET senha_hash = EXCLUDED.senha_hash
     RETURNING id, nome, email, perfil`,
    [nome, email, senhaHash]
  );

  console.log("[create-admin] usuário admin pronto:", rows[0]);
  await pool.end();
}

main().catch((erro) => {
  console.error("[create-admin] falhou:", erro.message);
  process.exit(1);
});
