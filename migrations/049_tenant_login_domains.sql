CREATE TABLE IF NOT EXISTS tenant_login_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_login_domains_domain_key UNIQUE (domain)
);

CREATE INDEX IF NOT EXISTS idx_tenant_login_domains_tenant_id
  ON tenant_login_domains (tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_login_domains_domain
  ON tenant_login_domains (domain);

INSERT INTO tenant_login_domains (tenant_id, domain)
SELECT DISTINCT u.tenant_id, split_part(lower(u.email), '@', 2) AS domain
FROM users u
WHERE u.role = 'Admin'
  AND position('@' in u.email) > 0
  AND split_part(lower(u.email), '@', 2) NOT IN (
    'gmail.com',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'msn.com',
    'icloud.com',
    'me.com',
    'yahoo.com',
    'yahoo.com.br',
    'bol.com.br',
    'uol.com.br',
    'terra.com.br',
    'aol.com',
    'proton.me',
    'protonmail.com'
  )
ON CONFLICT (domain) DO NOTHING;
