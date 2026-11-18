BEGIN;
ALTER TABLE lancamentos ADD COLUMN data_compra DATE;
ALTER TABLE lancamentos ADD COLUMN data_fechamento_fatura DATE;
COMMIT;
