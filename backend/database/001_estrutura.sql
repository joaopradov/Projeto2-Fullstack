-- Execute uma vez em um banco vazio. Uma falha desfaz toda a criação.
BEGIN;

CREATE TABLE usuarios (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR(120) NOT NULL CHECK (btrim(nome) <> ''),
  email VARCHAR(160) NOT NULL CONSTRAINT usuarios_email_key UNIQUE,
  cpf VARCHAR(11) NOT NULL CONSTRAINT usuarios_cpf_key UNIQUE,
  senha_hash VARCHAR(100) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (email = lower(btrim(email)) AND email <> ''),
  CHECK (cpf ~ '^[0-9]{11}$')
);

CREATE TABLE categorias (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  nome VARCHAR(60) NOT NULL CHECK (btrim(nome) <> ''),
  tipo VARCHAR(7) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  UNIQUE (usuario_id, nome, tipo),
  -- Alvo da FK composta: protege também o dono e o tipo do lançamento.
  UNIQUE (id, usuario_id, tipo)
);

CREATE TABLE fontes_destinos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  nome VARCHAR(60) NOT NULL CHECK (btrim(nome) <> ''),
  tipo VARCHAR(14) NOT NULL CHECK (tipo IN ('renda', 'conta', 'cartao_credito')),
  dia_fechamento SMALLINT CHECK (dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento SMALLINT CHECK (dia_vencimento BETWEEN 1 AND 31),
  limite NUMERIC(12,2) CHECK (limite >= 0),
  UNIQUE (usuario_id, nome),
  UNIQUE (id, usuario_id),
  CHECK (tipo <> 'cartao_credito' OR
    (dia_fechamento IS NOT NULL AND dia_vencimento IS NOT NULL AND limite IS NOT NULL))
);

CREATE TABLE lancamentos (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  tipo VARCHAR(7) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao VARCHAR(120) NOT NULL CHECK (btrim(descricao) <> ''),
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  data DATE NOT NULL,
  categoria_id INTEGER NOT NULL,
  fonte_destino_id INTEGER NOT NULL,
  parcela_atual SMALLINT NOT NULL DEFAULT 1,
  total_parcelas SMALLINT NOT NULL DEFAULT 1 CHECK (total_parcelas BETWEEN 1 AND 48),
  grupo_parcelamento UUID,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (parcela_atual BETWEEN 1 AND total_parcelas),
  CHECK (total_parcelas = 1 OR grupo_parcelamento IS NOT NULL),
  UNIQUE (usuario_id, grupo_parcelamento, parcela_atual),
  FOREIGN KEY (categoria_id, usuario_id, tipo)
    REFERENCES categorias(id, usuario_id, tipo) ON DELETE RESTRICT,
  FOREIGN KEY (fonte_destino_id, usuario_id)
    REFERENCES fontes_destinos(id, usuario_id) ON DELETE RESTRICT
);

CREATE INDEX idx_lancamentos_usuario_data ON lancamentos(usuario_id, data);
CREATE INDEX idx_lancamentos_categoria ON lancamentos(categoria_id, usuario_id, tipo);
CREATE INDEX idx_lancamentos_fonte ON lancamentos(fonte_destino_id, usuario_id);
COMMIT;
