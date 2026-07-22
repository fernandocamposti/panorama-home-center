-- Panorama Home Center — resumo completo da máquina
-- O agente já coletava fabricante/modelo/memória/disco/arquitetura mas a API
-- descartava tudo no checkin (só guardava cpu/mem/disco em % e SO). Agora
-- passa a guardar IP, processador e um resumo dos discos físicos também.

ALTER TABLE ativos ADD COLUMN IF NOT EXISTS ip TEXT;
ALTER TABLE ativos ADD COLUMN IF NOT EXISTS processador TEXT;
ALTER TABLE ativos ADD COLUMN IF NOT EXISTS fabricante TEXT;
ALTER TABLE ativos ADD COLUMN IF NOT EXISTS modelo TEXT;
ALTER TABLE ativos ADD COLUMN IF NOT EXISTS arquitetura TEXT;
ALTER TABLE ativos ADD COLUMN IF NOT EXISTS memoria_total_gb NUMERIC(6,1);
ALTER TABLE ativos ADD COLUMN IF NOT EXISTS disco_total_gb NUMERIC(8,1);
ALTER TABLE ativos ADD COLUMN IF NOT EXISTS disco_resumo TEXT;
ALTER TABLE ativos ADD COLUMN IF NOT EXISTS uptime_s BIGINT;
