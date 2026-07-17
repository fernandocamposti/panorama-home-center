const crypto = require("crypto");
const { pool } = require("../db");
const { exigirUsuario } = require("../auth");

module.exports = async function ativosRoutes(fastify) {
  fastify.addHook("preHandler", exigirUsuario);

  fastify.get("/api/ativos", async (request) => {
    const { tipo, filial_id, status } = request.query || {};
    const condicoes = [];
    const valores = [];

    if (tipo) { valores.push(tipo); condicoes.push(`tipo = $${valores.length}`); }
    if (filial_id) { valores.push(filial_id); condicoes.push(`filial_id = $${valores.length}`); }
    if (status) { valores.push(status); condicoes.push(`status = $${valores.length}`); }

    const where = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT * FROM ativos ${where} ORDER BY nome`,
      valores
    );
    return rows;
  });

  fastify.post("/api/ativos", async (request, reply) => {
    const { tipo, nome, filial_id, departamento_id, so } = request.body || {};
    if (!tipo || !nome || !filial_id) {
      return reply.code(400).send({ erro: "tipo, nome e filial_id são obrigatórios" });
    }

    const { rows } = await pool.query(
      `INSERT INTO ativos (tipo, nome, filial_id, departamento_id, so)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tipo, nome, filial_id, departamento_id || null, so || null]
    );
    return reply.code(201).send(rows[0]);
  });

  // Gera (ou regenera) o token do agente para este ativo — usado no
  // arquivo .env do agente instalado na máquina física correspondente.
  fastify.post("/api/ativos/:id/enroll", async (request, reply) => {
    const { id } = request.params;
    const token = crypto.randomBytes(32).toString("hex");

    const ativo = await pool.query("SELECT id FROM ativos WHERE id = $1", [id]);
    if (ativo.rows.length === 0) {
      return reply.code(404).send({ erro: "Ativo não encontrado" });
    }

    const { rows } = await pool.query(
      `INSERT INTO agentes (ativo_id, token)
       VALUES ($1, $2)
       ON CONFLICT (ativo_id) DO UPDATE SET token = EXCLUDED.token
       RETURNING id, ativo_id, token`,
      [id, token]
    );

    return reply.code(201).send(rows[0]);
  });
};
