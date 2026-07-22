const crypto = require("crypto");
const { pool } = require("../db");
const { exigirAgente } = require("../auth");

const LIMITE_CRITICO = 90; // % — mesmo limite usado nos cards de alerta do dashboard

// Evita criar um alerta duplicado se já existe um aberto do mesmo tipo para o ativo.
async function criarAlertaSeNecessario(ativoId, tipo, severidade, mensagem) {
  const existente = await pool.query(
    `SELECT id FROM alertas WHERE ativo_id = $1 AND tipo = $2 AND resolvido_em IS NULL`,
    [ativoId, tipo]
  );
  if (existente.rows.length > 0) return;

  await pool.query(
    `INSERT INTO alertas (ativo_id, tipo, severidade, mensagem) VALUES ($1, $2, $3, $4)`,
    [ativoId, tipo, severidade, mensagem]
  );
}

// Se um alerta do tipo estava aberto e a métrica normalizou, resolve automaticamente.
async function resolverAlertaSeAplicavel(ativoId, tipo) {
  await pool.query(
    `UPDATE alertas SET resolvido_em = now()
     WHERE ativo_id = $1 AND tipo = $2 AND resolvido_em IS NULL`,
    [ativoId, tipo]
  );
}

module.exports = async function agentsRoutes(fastify) {
  // Auto-cadastro: o próprio .exe chama isso na primeira vez que roda numa
  // máquina, sem precisar de um ativo pré-criado via cadastrar-ativo.sh.
  // Protegido por uma "chave de instalação" única (compartilhada por todos
  // os agentes, embutida no build do .exe) — não é o token final do agente.
  // Idempotente: se a mesma "chave_maquina" chamar de novo (reboot,
  // reinstalação), devolve o token já existente em vez de duplicar o ativo.
  fastify.post("/api/agents/self-enroll", async (request, reply) => {
    const { chave_instalacao, chave_maquina, hostname, so } = request.body || {};

    if (!process.env.PANORAMA_ENROLL_KEY) {
      return reply.code(503).send({ erro: "Auto-cadastro não habilitado neste servidor" });
    }
    if (!chave_instalacao || chave_instalacao !== process.env.PANORAMA_ENROLL_KEY) {
      return reply.code(401).send({ erro: "Chave de instalação inválida" });
    }
    if (!chave_maquina) {
      return reply.code(400).send({ erro: "chave_maquina é obrigatória" });
    }

    const existente = await pool.query(
      `SELECT g.token FROM ativos a
       JOIN agentes g ON g.ativo_id = a.id
       WHERE a.chave_maquina = $1`,
      [chave_maquina]
    );
    if (existente.rows.length > 0) {
      return { token: existente.rows[0].token };
    }

    const nome = hostname || `Novo dispositivo`;
    const ativo = await pool.query(
      `INSERT INTO ativos (tipo, nome, filial_id, so, chave_maquina)
       VALUES ('computador', $1, NULL, $2, $3) RETURNING id`,
      [nome, so || null, chave_maquina]
    );

    const token = crypto.randomBytes(32).toString("hex");
    await pool.query(`INSERT INTO agentes (ativo_id, token) VALUES ($1, $2)`, [ativo.rows[0].id, token]);

    return reply.code(201).send({ token, ativo_id: ativo.rows[0].id });
  });

  fastify.post("/api/agents/checkin", { preHandler: exigirAgente }, async (request, reply) => {
    const { cpu_pct, mem_pct, disco_pct, so } = request.body || {};
    const ativoId = request.agente.ativo_id;

    await pool.query(
      `INSERT INTO metricas (ativo_id, cpu_pct, mem_pct, disco_pct) VALUES ($1, $2, $3, $4)`,
      [ativoId, cpu_pct ?? null, mem_pct ?? null, disco_pct ?? null]
    );

    await pool.query(
      `UPDATE agentes SET ultimo_checkin = now() WHERE ativo_id = $1`,
      [ativoId]
    );
    await pool.query(
      `UPDATE ativos SET status = 'online', so = COALESCE($2, so) WHERE id = $1`,
      [ativoId, so || null]
    );

    // Regras de alerta simples (fase 4 do roadmap terá regras configuráveis).
    const checagens = [
      ["cpu", cpu_pct, `CPU acima de ${LIMITE_CRITICO}%`],
      ["memoria", mem_pct, `Memória acima de ${LIMITE_CRITICO}%`],
      ["disco", disco_pct, `Espaço em disco crítico`],
    ];

    for (const [tipo, valor, mensagem] of checagens) {
      if (valor == null) continue;
      if (valor >= LIMITE_CRITICO) {
        await criarAlertaSeNecessario(ativoId, tipo, "critico", mensagem);
      } else {
        await resolverAlertaSeAplicavel(ativoId, tipo);
      }
    }

    return { recebido: true };
  });
};
