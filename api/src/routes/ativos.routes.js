const crypto = require("crypto");
const { pool } = require("../db");
const { exigirUsuario, exigirAdmin } = require("../auth");

module.exports = async function ativosRoutes(fastify) {
  fastify.addHook("preHandler", exigirUsuario);

  fastify.get("/api/ativos", async (request, reply) => {
    const { tipo, filial_id, status, order, limit, nao_organizado } = request.query || {};
    const condicoes = [];
    const valores = [];

    if (tipo) { valores.push(tipo); condicoes.push(`a.tipo = $${valores.length}`); }
    if (filial_id) { valores.push(filial_id); condicoes.push(`a.filial_id = $${valores.length}`); }
    if (status) { valores.push(status); condicoes.push(`a.status = $${valores.length}`); }
    // Dispositivos que se auto-cadastraram via .exe e ainda não foram
    // organizados (nome/filial/departamento) pelo painel.
    if (nao_organizado === "1" || nao_organizado === "true") { condicoes.push(`a.filial_id IS NULL`); }

    const where = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";

    // order=recentes -> para a tabela "Últimos Computadores" do dashboard.
    const orderBy = order === "recentes" ? "a.criado_em DESC" : "a.nome ASC";

    let limitNum = 100;
    if (limit != null) {
      limitNum = Number(limit);
      if (!Number.isFinite(limitNum) || limitNum <= 0) {
        return reply.code(400).send({ erro: "limit inválido" });
      }
    }
    limitNum = Math.min(limitNum, 200);
    valores.push(limitNum);

    const { rows } = await pool.query(
      `SELECT a.*, f.nome AS filial_nome, d.nome AS departamento_nome, g.ultimo_checkin
       FROM ativos a
       LEFT JOIN filiais f ON f.id = a.filial_id
       LEFT JOIN departamentos d ON d.id = a.departamento_id
       LEFT JOIN agentes g ON g.ativo_id = a.id
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${valores.length}`,
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

  // Organiza um ativo (usado principalmente para dispositivos que se
  // auto-cadastraram via .exe sem filial/departamento/nome definidos):
  // atualiza só os campos enviados.
  fastify.patch("/api/ativos/:id", async (request, reply) => {
    const { id } = request.params;
    const { nome, tipo, filial_id, departamento_id } = request.body || {};

    const campos = [];
    const valores = [];
    if (nome !== undefined) { valores.push(nome); campos.push(`nome = $${valores.length}`); }
    if (tipo !== undefined) { valores.push(tipo); campos.push(`tipo = $${valores.length}`); }
    if (filial_id !== undefined) { valores.push(filial_id); campos.push(`filial_id = $${valores.length}`); }
    if (departamento_id !== undefined) { valores.push(departamento_id); campos.push(`departamento_id = $${valores.length}`); }

    if (campos.length === 0) {
      return reply.code(400).send({ erro: "Nada para atualizar" });
    }

    valores.push(id);
    const { rows } = await pool.query(
      `UPDATE ativos SET ${campos.join(", ")} WHERE id = $${valores.length} RETURNING *`,
      valores
    );
    if (rows.length === 0) {
      return reply.code(404).send({ erro: "Ativo não encontrado" });
    }
    return rows[0];
  });

  // Exclui um ativo (ex.: máquina desativada/trocada). Restrito a admin
  // porque é destrutivo e apaga métricas/alertas em cascata.
  fastify.delete("/api/ativos/:id", { preHandler: exigirAdmin }, async (request, reply) => {
    const { id } = request.params;
    const { rowCount } = await pool.query("DELETE FROM ativos WHERE id = $1", [id]);
    if (rowCount === 0) {
      return reply.code(404).send({ erro: "Ativo não encontrado" });
    }
    return reply.code(204).send();
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
