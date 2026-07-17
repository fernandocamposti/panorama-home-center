-- Panorama Home Center — schema inicial (Fase 1)
-- Rodar com: node scripts/migrate.js

CREATE TABLE IF NOT EXISTS filiais (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departamentos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  filial_id INTEGER NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuarios_ti (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  filial_id INTEGER REFERENCES filiais(id) ON DELETE SET NULL,
  perfil TEXT NOT NULL DEFAULT 'viewer' CHECK (perfil IN ('admin', 'viewer')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ativos (
  id SERIAL PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('computador', 'servidor', 'rede', 'impressora', 'telefone', 'monitor')),
  nome TEXT NOT NULL,
  filial_id INTEGER NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  departamento_id INTEGER REFERENCES departamentos(id) ON DELETE SET NULL,
  so TEXT,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ativos_filial ON ativos(filial_id);
CREATE INDEX IF NOT EXISTS idx_ativos_status ON ativos(status);

CREATE TABLE IF NOT EXISTS agentes (
  id SERIAL PRIMARY KEY,
  ativo_id INTEGER NOT NULL UNIQUE REFERENCES ativos(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  versao TEXT,
  ultimo_checkin TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metricas (
  id BIGSERIAL PRIMARY KEY,
  ativo_id INTEGER NOT NULL REFERENCES ativos(id) ON DELETE CASCADE,
  cpu_pct NUMERIC(5,1),
  mem_pct NUMERIC(5,1),
  disco_pct NUMERIC(5,1),
  registrado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metricas_ativo_tempo ON metricas(ativo_id, registrado_em DESC);

CREATE TABLE IF NOT EXISTS alertas (
  id SERIAL PRIMARY KEY,
  ativo_id INTEGER NOT NULL REFERENCES ativos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  severidade TEXT NOT NULL DEFAULT 'aviso' CHECK (severidade IN ('critico', 'aviso')),
  mensagem TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolvido_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alertas_abertos ON alertas(ativo_id, tipo) WHERE resolvido_em IS NULL;

CREATE TABLE IF NOT EXISTS inventario_software (
  id BIGSERIAL PRIMARY KEY,
  ativo_id INTEGER NOT NULL REFERENCES ativos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  versao TEXT,
  instalado_em DATE
);
