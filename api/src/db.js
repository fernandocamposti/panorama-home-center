const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  // Erros de conexão idle não devem derrubar o processo — só logar.
  console.error("[db] erro inesperado no pool:", err.message);
});

module.exports = { pool };
