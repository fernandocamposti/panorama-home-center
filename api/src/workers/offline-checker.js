const { pool } = require("../db");

const LIMITE_MINUTOS = Number(process.env.OFFLINE_THRESHOLD_MINUTES || 5);

// Roda periodicamente: se um ativo tem agente mas não faz checkin há mais
// tempo que o limite, marca como offline e abre um alerta (se ainda não houver um).
async function verificarOffline() {
  try {
    const { rows: expirados } = await pool.query(
      `SELECT a.id AS ativo_id, a.nome
       FROM ativos a
       JOIN agentes g ON g.ativo_id = a.id
       WHERE a.status = 'online'
         AND (g.ultimo_checkin IS NULL OR g.ultimo_checkin < now() - ($1 || ' minutes')::interval)`,
      [LIMITE_MINUTOS]
    );

    for (const ativo of expirados) {
      await pool.query(`UPDATE ativos SET status = 'offline' WHERE id = $1`, [ativo.ativo_id]);

      const existente = await pool.query(
        `SELECT id FROM alertas WHERE ativo_id = $1 AND tipo = 'offline' AND resolvido_em IS NULL`,
        [ativo.ativo_id]
      );
      if (existente.rows.length === 0) {
        await pool.query(
          `INSERT INTO alertas (ativo_id, tipo, severidade, mensagem)
           VALUES ($1, 'offline', 'aviso', $2)`,
          [ativo.ativo_id, `Sem checkin há mais de ${LIMITE_MINUTOS} minutos`]
        );
      }
    }

    if (expirados.length > 0) {
      console.log(`[offline-checker] ${expirados.length} ativo(s) marcado(s) como offline`);
    }
  } catch (erro) {
    console.error("[offline-checker] erro:", erro.message);
  }
}

function iniciarOfflineChecker() {
  const intervaloMs = Math.max(30_000, (LIMITE_MINUTOS * 60_000) / 2);
  setInterval(verificarOffline, intervaloMs);
  verificarOffline();
}

module.exports = { iniciarOfflineChecker };
