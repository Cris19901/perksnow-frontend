-- Add Korapay-specific fields to wallet_withdrawals
ALTER TABLE wallet_withdrawals
  ADD COLUMN IF NOT EXISTS bank_code            TEXT,
  ADD COLUMN IF NOT EXISTS korapay_transfer_id  TEXT,
  ADD COLUMN IF NOT EXISTS payout_provider      TEXT DEFAULT 'manual';

-- Index for webhook lookups by reference
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_reference
  ON wallet_withdrawals (transaction_reference)
  WHERE transaction_reference IS NOT NULL;

-- Ensure payment_webhooks has the columns we need (from backend_improvements migration)
ALTER TABLE payment_webhooks
  ADD COLUMN IF NOT EXISTS event_id     TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhooks_korapay_dedup
  ON payment_webhooks (provider, event_type, event_id)
  WHERE event_id IS NOT NULL;
