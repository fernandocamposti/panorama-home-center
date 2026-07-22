const { pool } = require("../db");
const { exigirUsuario } = require("../auth");

module.exports = async function alertasRoutes(fastify) {
  fastify.addHook("preHandler", exigirUsuario);

  // status: "abertos" (padrão), "resolvidos" ou "todos"
  fastify.get("/api/alertas", async (request) => {
    const { status } = request.query || {};
    let condicao = "al.resolvido_em IS NULL";
    if (status === "resolvidos") condicao = "al.resolvido_em IS NOT NULL";
    if (status === "todos") condicao = "TRUE";

    const { rows } = await pool.query(`
      SELECT al.id, al.tipo, al.severidade, al.mensagem, al.criado_em, al.resolvido_em,
             a.id AS ativo_id, a.nome AS ativo_nome
      FROM alertas al
      JOIN ativos a ON a.id = al.ativo_id
      WHERE ${condicao}
      ORDER BY al.criado_em DESC
      LIMIT 200
    `);
    return rows;
  });

  // Resolução manual (além da automática que já acontece no checkin quando a
  // métrica volta ao normal) — útil pra alertas que não se auto-resolvem
  // (ex.: algo que o usuário já corrigiu fisicamente na máquina).
  fastify.patch("/api/alertas/:id/resolver", async (request, reply) => {
    const { id } = request.params;
    const { rows } = await pool.query(
      `UPDATE alertas SET resolvido_em = now() WHERE id = $1 AND resolvido_em IS NULL RETURNING *`,
      [id]
    );
    if (rows.length === 0) {
      return reply.code(404).send({ erro: "Alerta não encontrado ou já resolvido" });
    }
    return rows[0];
  });
};
