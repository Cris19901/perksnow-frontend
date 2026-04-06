-- Support tickets system for AI contact widget

CREATE TABLE IF NOT EXISTS support_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'general',
  subject       TEXT,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority      TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  ai_handled    BOOLEAN DEFAULT TRUE,
  escalated     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id    ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status     ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_escalated  ON support_tickets (escalated) WHERE escalated = TRUE;
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages (ticket_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_ticket_updated_at ON support_tickets;
CREATE TRIGGER trg_support_ticket_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_support_ticket_timestamp();

-- RLS
ALTER TABLE support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Users can see their own tickets
CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  USING (user_id = auth.uid() OR email = (SELECT email FROM users WHERE id = auth.uid()));

CREATE POLICY "Anyone can create tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Users can view messages on own tickets"
  ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets t
      WHERE t.id = ticket_id
        AND (t.user_id = auth.uid() OR t.email = (SELECT email FROM users WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Anyone can create messages"
  ON support_messages FOR INSERT
  WITH CHECK (TRUE);

-- Admins see everything
CREATE POLICY "Admins can view all tickets"
  ON support_tickets FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view all messages"
  ON support_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

GRANT SELECT, INSERT ON support_tickets  TO authenticated, anon;
GRANT SELECT, INSERT ON support_messages TO authenticated, anon;
GRANT ALL ON support_tickets  TO service_role;
GRANT ALL ON support_messages TO service_role;
