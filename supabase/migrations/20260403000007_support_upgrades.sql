-- Support system upgrades: agent assignment, CSAT, mode, read receipts

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS mode        TEXT        NOT NULL DEFAULT 'ai'
    CHECK (mode IN ('ai', 'human', 'closed')),
  ADD COLUMN IF NOT EXISTS assigned_to UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS csat_score  SMALLINT    CHECK (csat_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS csat_comment TEXT,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS unread_agent_count INT DEFAULT 0;

ALTER TABLE support_messages
  ADD COLUMN IF NOT EXISTS agent_name TEXT,
  ADD COLUMN IF NOT EXISTS read_at    TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_support_tickets_mode        ON support_tickets (mode);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets (assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_last_msg    ON support_tickets (last_message_at DESC);

-- Function: agent takes over a ticket
CREATE OR REPLACE FUNCTION agent_takeover_ticket(
  p_ticket_id  UUID,
  p_agent_id   UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_agent_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can take over tickets';
  END IF;

  UPDATE support_tickets SET
    mode        = 'human',
    assigned_to = p_agent_id,
    assigned_at = now(),
    status      = 'in_progress',
    updated_at  = now()
  WHERE id = p_ticket_id;

  -- Insert system message visible to user
  INSERT INTO support_messages (ticket_id, role, content, agent_name)
  VALUES (
    p_ticket_id,
    'system',
    (SELECT COALESCE(username, 'a support agent') FROM users WHERE id = p_agent_id)
      || ' has joined the conversation.',
    (SELECT COALESCE(username, 'Support') FROM users WHERE id = p_agent_id)
  );
END;
$$;

-- Function: agent resolves a ticket
CREATE OR REPLACE FUNCTION agent_resolve_ticket(
  p_ticket_id UUID,
  p_agent_id  UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_agent_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can resolve tickets';
  END IF;

  UPDATE support_tickets SET
    mode        = 'closed',
    status      = 'resolved',
    resolved_at = now(),
    updated_at  = now()
  WHERE id = p_ticket_id;

  INSERT INTO support_messages (ticket_id, role, content)
  VALUES (p_ticket_id, 'system', 'This conversation has been resolved. How did we do?');
END;
$$;

-- Function: submit CSAT rating
CREATE OR REPLACE FUNCTION submit_csat(
  p_ticket_id   UUID,
  p_score       SMALLINT,
  p_comment     TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE support_tickets SET
    csat_score   = p_score,
    csat_comment = p_comment,
    updated_at   = now()
  WHERE id = p_ticket_id
    AND status = 'resolved';
END;
$$;

GRANT EXECUTE ON FUNCTION agent_takeover_ticket(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION agent_resolve_ticket(UUID, UUID)  TO authenticated;
GRANT EXECUTE ON FUNCTION submit_csat(UUID, SMALLINT, TEXT) TO authenticated, anon;

-- Allow agents to update tickets and insert messages
CREATE POLICY "Admins can update tickets"
  ON support_tickets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert messages"
  ON support_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
