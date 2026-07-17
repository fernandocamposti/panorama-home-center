const { pool } = require("../db");
const { exigirUsuario } = require("../auth");

module.exports = async function departamentosRoutes(fastify) {
  fastify.addHook("preHandler", exigirUsuario);

  fastify.get("/api/departamentos", async (request) => {
    const { filial_id } = request.query || {};
    if (filial_id) {
      const { rows } = await pool.query(
        "SELECT * FROM departamentos WHERE filial_id = $1 ORDER BY nome",
        [filial_id]
      );
      return rows;
    }
    const { rows } = await pool.query("SELECT * FROM departamentos ORDER BY nome");
    return rows;
  });

  fastify.post("/api/departamentos", async (request, reply) => {
    const { nome, filial_id } = request.body || {};
    if (!nome || !filial_id) {
      return reply.code(400).send({ erro: "nome e filial_id são obrigatórios" });
    }

    const { rows } = await pool.query(
      "INSERT INTO departamentos (nome, filial_id) VALUES ($1, $2) RETURNING *",
      [nome, filial_id]
    );
    return reply.code(201).send(rows[0]);
  });
};
