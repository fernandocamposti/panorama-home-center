const { pool } = require("../db");
const { exigirUsuario } = require("../auth");

module.exports = async function filiaisRoutes(fastify) {
  fastify.addHook("preHandler", exigirUsuario);

  fastify.get("/api/filiais", async () => {
    const { rows } = await pool.query("SELECT * FROM filiais ORDER BY nome");
    return rows;
  });

  fastify.post("/api/filiais", async (request, reply) => {
    const { nome, endereco } = request.body || {};
    if (!nome) return reply.code(400).send({ erro: "nome é obrigatório" });

    const { rows } = await pool.query(
      "INSERT INTO filiais (nome, endereco) VALUES ($1, $2) RETURNING *",
      [nome, endereco || null]
    );
    return reply.code(201).send(rows[0]);
  });
};
