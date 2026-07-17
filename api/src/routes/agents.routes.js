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
  fastify.post("/api/agents/checkin", { preHandler: exigirAgente }, async (request, reply) => {
    const { cpu_pct, mem_pct, disco_pct } = request.body || {};
    const ativoId = request.agente.ativo_id;

    await pool.query(
      `INSERT INTO metricas (ativo_id, cpu_pct, mem_pct, disco_pct) VALUES ($1, $2, $3, $4)`,
      [ativoId, cpu_pct ?? null, mem_pct ?? null, disco_pct ?? null]
    );

    await pool.query(
      `UPDATE agentes SET ultimo_checkin = now() WHERE ativo_id = $1`,
      [ativoId]
    );
    await pool.query(`UPDATE ativos SET status = 'online' WHERE id = $1`, [ativoId]);

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
