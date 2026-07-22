const bcrypt = require("bcryptjs");
const { pool } = require("../db");
const { exigirUsuario, exigirAdmin } = require("../auth");

// Gestão dos usuários que acessam o painel (usuarios_ti) — não confundir com
// os agentes instalados nas máquinas. Toda a rota é restrita a admin: mesmo
// listar e-mails de outras pessoas é informação sensível o bastante pra não
// liberar pra perfil "viewer".
module.exports = async function usuariosRoutes(fastify) {
  fastify.addHook("preHandler", exigirUsuario);
  fastify.addHook("preHandler", exigirAdmin);

  fastify.get("/api/usuarios", async () => {
    const { rows } = await pool.query(`
      SELECT u.id, u.nome, u.email, u.perfil, u.filial_id, f.nome AS filial_nome, u.criado_em
      FROM usuarios_ti u
      LEFT JOIN filiais f ON f.id = u.filial_id
      ORDER BY u.nome
    `);
    return rows;
  });

  fastify.post("/api/usuarios", async (request, reply) => {
    const { nome, email, senha, perfil, filial_id } = request.body || {};
    if (!nome || !email || !senha) {
      return reply.code(400).send({ erro: "nome, email e senha são obrigatórios" });
    }

    const perfilValido = perfil === "admin" ? "admin" : "viewer";
    const senhaHash = await bcrypt.hash(senha, 10);

    try {
      const { rows } = await pool.query(
        `INSERT INTO usuarios_ti (nome, email, senha_hash, perfil, filial_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, nome, email, perfil, filial_id, criado_em`,
        [nome, email, senhaHash, perfilValido, filial_id || null]
      );
      return reply.code(201).send(rows[0]);
    } catch (e) {
      if (e.code === "23505") return reply.code(409).send({ erro: "Já existe um usuário com esse e-mail" });
      throw e;
    }
  });

  fastify.patch("/api/usuarios/:id", async (request, reply) => {
    const { id } = request.params;
    const { nome, email, senha, perfil, filial_id } = request.body || {};

    const campos = [];
    const valores = [];
    if (nome !== undefined) { valores.push(nome); campos.push(`nome = $${valores.length}`); }
    if (email !== undefined) { valores.push(email); campos.push(`email = $${valores.length}`); }
    if (perfil !== undefined) { valores.push(perfil === "admin" ? "admin" : "viewer"); campos.push(`perfil = $${valores.length}`); }
    if (filial_id !== undefined) { valores.push(filial_id || null); campos.push(`filial_id = $${valores.length}`); }
    if (senha) { valores.push(await bcrypt.hash(senha, 10)); campos.push(`senha_hash = $${valores.length}`); }

    if (campos.length === 0) {
      return reply.code(400).send({ erro: "Nada para atualizar" });
    }

    valores.push(id);
    try {
      const { rows } = await pool.query(
        `UPDATE usuarios_ti SET ${campos.join(", ")} WHERE id = $${valores.length}
         RETURNING id, nome, email, perfil, filial_id, criado_em`,
        valores
      );
      if (rows.length === 0) {
        return reply.code(404).send({ erro: "Usuário não encontrado" });
      }
      return rows[0];
    } catch (e) {
      if (e.code === "23505") return reply.code(409).send({ erro: "Já existe um usuário com esse e-mail" });
      throw e;
    }
  });

  fastify.delete("/api/usuarios/:id", async (request, reply) => {
    const { id } = request.params;
    if (Number(id) === request.usuario.id) {
      return reply.code(400).send({ erro: "Você não pode excluir seu próprio usuário" });
    }
    const { rowCount } = await pool.query("DELETE FROM usuarios_ti WHERE id = $1", [id]);
    if (rowCount === 0) {
      return reply.code(404).send({ erro: "Usuário não encontrado" });
    }
    return reply.code(204).send();
  });
};
