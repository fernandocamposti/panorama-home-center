const { pool } = require("../db");
const { exigirUsuario } = require("../auth");

module.exports = async function dashboardRoutes(fastify) {
  fastify.addHook("preHandler", exigirUsuario);

  // Mesmo formato dos cards do topo do dashboard (online/offline por tipo).
  fastify.get("/api/dashboard/resumo", async () => {
    // SUM(CASE WHEN...) em vez de COUNT(*) FILTER — mesmo resultado, mais
    // portável entre versões/variações de Postgres.
    const porTipo = await pool.query(`
      SELECT tipo,
             SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) AS online,
             SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) AS offline,
             COUNT(*) AS total
      FROM ativos
      GROUP BY tipo
    `);

    const alertasCriticos = await pool.query(`
      SELECT COUNT(*) AS total FROM alertas WHERE severidade = 'critico' AND resolvido_em IS NULL
    `);

    // Agregações de ativos e de alertas calculadas em subqueries separadas
    // antes do JOIN com filiais, para não inflar as contagens quando um
    // ativo tem mais de um alerta aberto (join direto duplicaria a linha).
    const porFilial = await pool.query(`
      SELECT f.id, f.nome,
             COALESCE(ativos_agg.online, 0) AS online,
             COALESCE(ativos_agg.offline, 0) AS offline,
             COALESCE(alertas_agg.total, 0) AS alertas
      FROM filiais f
      LEFT JOIN (
        SELECT filial_id,
               SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END) AS online,
               SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END) AS offline
        FROM ativos
        GROUP BY filial_id
      ) ativos_agg ON ativos_agg.filial_id = f.id
      LEFT JOIN (
        SELECT a.filial_id, COUNT(*) AS total
        FROM alertas al
        JOIN ativos a ON a.id = al.ativo_id
        WHERE al.resolvido_em IS NULL
        GROUP BY a.filial_id
      ) alertas_agg ON alertas_agg.filial_id = f.id
      ORDER BY f.nome
    `);

    return {
      por_tipo: porTipo.rows,
      alertas_criticos: Number(alertasCriticos.rows[0].total),
      por_filial: porFilial.rows,
    };
  });

  fastify.get("/api/dashboard/alertas-recentes", async () => {
    const { rows } = await pool.query(`
      SELECT al.id, al.tipo, al.severidade, al.mensagem, al.criado_em, a.nome AS ativo_nome
      FROM alertas al
      JOIN ativos a ON a.id = al.ativo_id
      WHERE al.resolvido_em IS NULL
      ORDER BY al.criado_em DESC
      LIMIT 10
    `);
    return rows;
  });

  // Donut "Status de Sistemas" — distribuição de ativos por SO.
  // SO nulo (dispositivos de rede, impressoras etc. sem agente) entra como "Outros".
  // Offline entra como categoria própria, igual no dashboard original.
  fastify.get("/api/dashboard/por-so", async () => {
    // Repete a expressão CASE inteira no GROUP BY (em vez de agrupar pelo
    // alias "categoria") — mais portável entre bancos/versões de Postgres.
    const casoCategoria = `
      CASE
        WHEN status = 'offline' THEN 'Offline'
        WHEN so ILIKE 'windows%' THEN 'Windows'
        WHEN so ILIKE 'linux%' THEN 'Linux'
        ELSE 'Outros'
      END
    `;
    const { rows } = await pool.query(`
      SELECT ${casoCategoria} AS categoria, COUNT(*) AS total
      FROM ativos
      GROUP BY ${casoCategoria}
      ORDER BY total DESC
    `);
    return rows;
  });

  // "Top Departamentos por Equipamentos"
  fastify.get("/api/dashboard/top-departamentos", async () => {
    const { rows } = await pool.query(`
      SELECT d.id, d.nome, COUNT(a.id) AS total
      FROM departamentos d
      LEFT JOIN ativos a ON a.departamento_id = d.id
      GROUP BY d.id, d.nome
      ORDER BY total DESC
      LIMIT 10
    `);
    return rows;
  });
};
