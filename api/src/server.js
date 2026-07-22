require("dotenv").config();
const fastify = require("fastify")({ logger: true });

async function main() {
  await fastify.register(require("@fastify/cors"), { origin: true });

  // Alguns clientes (curl, libs de HTTP) mandam "Content-Type: application/json"
  // mesmo em requisições sem corpo (ex.: POST /enroll). O parser padrão do
  // Fastify rejeita corpo vazio nesse caso — tratamos como {} em vez de erro 400.
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    function (request, body, done) {
      if (!body) return done(null, {});
      try {
        done(null, JSON.parse(body));
      } catch (erro) {
        erro.statusCode = 400;
        done(erro, undefined);
      }
    }
  );

  fastify.get("/health", async () => ({ status: "ok" }));

  await fastify.register(require("./routes/auth.routes"));
  await fastify.register(require("./routes/filiais.routes"));
  await fastify.register(require("./routes/departamentos.routes"));
  await fastify.register(require("./routes/ativos.routes"));
  await fastify.register(require("./routes/agents.routes"));
  await fastify.register(require("./routes/dashboard.routes"));
  await fastify.register(require("./routes/usuarios.routes"));
  await fastify.register(require("./routes/alertas.routes"));

  const porta = Number(process.env.PORT || 3000);
  await fastify.listen({ port: porta, host: "0.0.0.0" });

  // Worker de background só é ativado se houver banco configurado
  // (evita crash caso alguém rode a API sem DATABASE_URL, ex.: smoke test).
  if (process.env.DATABASE_URL) {
    const { iniciarOfflineChecker } = require("./workers/offline-checker");
    iniciarOfflineChecker();
  }
}

main().catch((erro) => {
  fastify.log.error(erro);
  process.exit(1);
});
