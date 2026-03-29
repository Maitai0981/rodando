-- Funcionários (staff) como papel separado do owner
INSERT INTO roles (code, name) VALUES ('staff', 'Funcionário') ON CONFLICT (code) DO NOTHING;

-- Controle de ativação e vínculo de criação para usuários staff
ALTER TABLE users ADD COLUMN IF NOT EXISTS active              BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_owner_id BIGINT  REFERENCES users(id) ON DELETE SET NULL;

-- Captura de contexto de rede nos logs de auditoria
ALTER TABLE owner_audit_logs ADD COLUMN IF NOT EXISTS ip_address  TEXT;
ALTER TABLE owner_audit_logs ADD COLUMN IF NOT EXISTS user_agent  TEXT;

CREATE INDEX IF NOT EXISTS idx_owner_audit_logs_ip ON owner_audit_logs (ip_address) WHERE ip_address IS NOT NULL;
