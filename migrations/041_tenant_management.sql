-- 041_tenant_management.sql
-- Adiciona campos de gestão de tenants para o Painel Super Admin (Black Tower X)

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'TRIAL';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_platform_owner BOOLEAN NOT NULL DEFAULT FALSE;

-- Marcar o tenant Black Tower X como dono da plataforma
UPDATE tenants SET is_platform_owner = TRUE WHERE slug = 'black-tower-x';

-- Adicionar coluna is_platform_admin nos usuários
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;
