-- Panorama Home Center — auto-cadastro do agente (zero-touch)
-- Permite que o próprio .exe se cadastre no painel sem um ativo pré-criado
-- via cadastrar-ativo.sh — a pessoa organiza (nome/filial/departamento)
-- depois, pelo painel.

-- Um ativo auto-cadastrado ainda não tem filial definida.
ALTER TABLE ativos ALTER COLUMN filial_id DROP NOT NULL;

-- Identifica de forma estável a máquina física, para o mesmo computador
-- nunca virar dois ativos (reinstalação, reboot, etc. reusam o token).
ALTER TABLE ativos ADD COLUMN IF NOT EXISTS chave_maquina TEXT UNIQUE;
