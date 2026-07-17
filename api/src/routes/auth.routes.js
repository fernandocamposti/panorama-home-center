const bcrypt = require("bcryptjs");
const { pool } = require("../db");
const { assinarTokenUsuario } = require("../auth");

module.exports = async function authRoutes(fastify) {
  fastify.post("/api/auth/login", async (request, reply) => {
    const { email, senha } = request.body || {};

    if (!email || !senha) {
      return reply.code(400).send({ erro: "email e senha são obrigatórios" });
    }

    const { rows } = await pool.query(
      "SELECT id, nome, senha_hash, perfil FROM usuarios_ti WHERE email = $1",
      [email]
    );

    const usuario = rows[0];
    const senhaOk = usuario ? await bcrypt.compare(senha, usuario.senha_hash) : false;

    if (!senhaOk) {
      return reply.code(401).send({ erro: "Credenciais inválidas" });
    }

    const token = assinarTokenUsuario(usuario);
    return { token, usuario: { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil } };
  });
};
