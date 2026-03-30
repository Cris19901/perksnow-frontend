-- Backend improvement migration: idempotency + aggregation RPCs

-- 1. Add event_id column to payment_webhooks for idempotent webhook processing.
--    event_id is the provider's event/charge ID so we can detect duplicate deliveries.
ALTER TABLE IF EXISTS payment_webhooks
  ADD COLUMN IF NOT EXISTS event_id TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ DEFAULT now();

-- Unique constraint so the same event from the same provider is never processed twice.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhooks_provider_event
  ON payment_webhooks (provider, event_type, event_id)
  WHERE event_id IS NOT NULL;

-- 2. Create payment_webhooks table if it doesn't exist yet.
CREATE TABLE IF NOT EXISTS payment_webhooks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider    TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  event_id    TEXT,
  payload     JSONB,
  processed_at TIMESTAMPTZ DEFAULT now(),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Re-apply the unique index after potential table creation.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhooks_provider_event
  ON payment_webhooks (provider, event_type, event_id)
  WHERE event_id IS NOT NULL;

GRANT INSERT, SELECT ON payment_webhooks TO service_role;

-- 3. RPC: get_user_total_earnings — avoids loading every row into the app server.
CREATE OR REPLACE FUNCTION get_user_total_earnings(p_user_id UUID)
RETURNS BIGINT
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(SUM(amount), 0)::BIGINT FROM earnings WHERE user_id = p_user_id;
$$;

-- 4. RPC: get_user_points_earned — sum of all positive points transactions.
CREATE OR REPLACE FUNCTION get_user_points_earned(p_user_id UUID)
RETURNS BIGINT
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(SUM(points), 0)::BIGINT
  FROM points_transactions
  WHERE user_id = p_user_id AND points > 0;
$$;

GRANT EXECUTE ON FUNCTION get_user_total_earnings(UUID) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_user_points_earned(UUID) TO service_role, authenticated;
