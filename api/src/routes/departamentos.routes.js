const { pool } = require("../db");
const { exigirUsuario, exigirAdmin } = require("../auth");

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

  fastify.patch("/api/departamentos/:id", async (request, reply) => {
    const { id } = request.params;
    const { nome, filial_id } = request.body || {};

    const campos = [];
    const valores = [];
    if (nome !== undefined) { valores.push(nome); campos.push(`nome = $${valores.length}`); }
    if (filial_id !== undefined) { valores.push(filial_id); campos.push(`filial_id = $${valores.length}`); }

    if (campos.length === 0) {
      return reply.code(400).send({ erro: "Nada para atualizar" });
    }

    valores.push(id);
    const { rows } = await pool.query(
      `UPDATE departamentos SET ${campos.join(", ")} WHERE id = $${valores.length} RETURNING *`,
      valores
    );
    if (rows.length === 0) {
      return reply.code(404).send({ erro: "Departamento não encontrado" });
    }
    return rows[0];
  });

  // Seguro apagar direto: ativos.departamento_id é ON DELETE SET NULL (não
  // cascateia), então os ativos só ficam sem departamento, não são apagados.
  fastify.delete("/api/departamentos/:id", { preHandler: exigirAdmin }, async (request, reply) => {
    const { id } = request.params;
    const { rowCount } = await pool.query("DELETE FROM departamentos WHERE id = $1", [id]);
    if (rowCount === 0) {
      return reply.code(404).send({ erro: "Departamento não encontrado" });
    }
    return reply.code(204).send();
  });
};
