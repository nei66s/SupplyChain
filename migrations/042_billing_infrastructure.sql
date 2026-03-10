-- Migration 042: Billing Infrastructure (Asaas Integration)
-- Desc: Adds columns to support automated payment flows and subscription management.

ALTER TABLE tenants 
ADD COLUMN asaas_customer_id VARCHAR(50),
ADD COLUMN asaas_subscription_id VARCHAR(50),
ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'INCOMPLETE',
ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Status possible values: INCOMPLETE, ACTIVE, PAST_DUE, CANCELED
