const jwt = require("jsonwebtoken");
const { pool } = require("./db");

const JWT_SECRET = process.env.JWT_SECRET;

function assinarTokenUsuario(usuario) {
  return jwt.sign(
    { id: usuario.id, perfil: usuario.perfil, nome: usuario.nome },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

// preHandler do Fastify: exige "Authorization: Bearer <jwt>" de um usuário logado.
async function exigirUsuario(request, reply) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return reply.code(401).send({ erro: "Token de usuário ausente" });
  }

  try {
    request.usuario = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return reply.code(401).send({ erro: "Token de usuário inválido ou expirado" });
  }
}

function exigirAdmin(request, reply, done) {
  if (request.usuario?.perfil !== "admin") {
    return reply.code(403).send({ erro: "Requer perfil admin" });
  }
  done();
}

// preHandler do Fastify: exige "Authorization: Bearer <token-do-agente>",
// validado contra a tabela agentes (não é JWT — é um token opaco de longa duração).
async function exigirAgente(request, reply) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return reply.code(401).send({ erro: "Token de agente ausente" });
  }

  const { rows } = await pool.query(
    "SELECT id, ativo_id FROM agentes WHERE token = $1",
    [token]
  );

  if (rows.length === 0) {
    return reply.code(401).send({ erro: "Token de agente inválido" });
  }

  request.agente = rows[0];
}

module.exports = { assinarTokenUsuario, exigirUsuario, exigirAdmin, exigirAgente };
