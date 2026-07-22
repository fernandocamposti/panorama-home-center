const { pool } = require("../db");
const { exigirUsuario, exigirAdmin } = require("../auth");

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

  fastify.patch("/api/filiais/:id", async (request, reply) => {
    const { id } = request.params;
    const { nome, endereco } = request.body || {};

    const campos = [];
    const valores = [];
    if (nome !== undefined) { valores.push(nome); campos.push(`nome = $${valores.length}`); }
    if (endereco !== undefined) { valores.push(endereco); campos.push(`endereco = $${valores.length}`); }

    if (campos.length === 0) {
      return reply.code(400).send({ erro: "Nada para atualizar" });
    }

    valores.push(id);
    const { rows } = await pool.query(
      `UPDATE filiais SET ${campos.join(", ")} WHERE id = $${valores.length} RETURNING *`,
      valores
    );
    if (rows.length === 0) {
      return reply.code(404).send({ erro: "Filial não encontrada" });
    }
    return rows[0];
  });

  // Restrito a admin — e bloqueado se ainda houver ativos/departamentos
  // vinculados, pra não apagar dado em cascata sem querer (ativos.filial_id
  // e departamentos.filial_id têm ON DELETE CASCADE no banco).
  fastify.delete("/api/filiais/:id", { preHandler: exigirAdmin }, async (request, reply) => {
    const { id } = request.params;

    const vinculados = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM ativos WHERE filial_id = $1) AS ativos,
         (SELECT COUNT(*) FROM departamentos WHERE filial_id = $1) AS departamentos`,
      [id]
    );
    const { ativos, departamentos } = vinculados.rows[0];
    if (Number(ativos) > 0 || Number(departamentos) > 0) {
      return reply.code(409).send({
        erro: `Não é possível excluir: existem ${ativos} ativo(s) e ${departamentos} departamento(s) vinculados a esta filial. Mova ou exclua-os primeiro.`,
      });
    }

    const { rowCount } = await pool.query("DELETE FROM filiais WHERE id = $1", [id]);
    if (rowCount === 0) {
      return reply.code(404).send({ erro: "Filial não encontrada" });
    }
    return reply.code(204).send();
  });
};
