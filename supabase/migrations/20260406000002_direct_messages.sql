-- Direct messaging system
-- Drop any prior partial tables so we can recreate cleanly
DROP TABLE IF EXISTS direct_messages CASCADE;
DROP TABLE IF EXISTS conversations    CASCADE;

-- Conversations (one per pair of users, canonical order: smaller UUID first)
CREATE TABLE conversations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  user1_unread INT         DEFAULT 0,
  user2_unread INT         DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT conversations_ordered CHECK (user1_id < user2_id),
  UNIQUE (user1_id, user2_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_user1 ON conversations (user1_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_user2 ON conversations (user2_id, last_message_at DESC);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can see conversation" ON conversations;
CREATE POLICY "Participants can see conversation"
  ON conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Participants can update conversation" ON conversations;
CREATE POLICY "Participants can update conversation"
  ON conversations FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can start conversation" ON conversations;
CREATE POLICY "Users can start conversation"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

GRANT SELECT, INSERT, UPDATE ON conversations TO authenticated;
GRANT ALL ON conversations TO service_role;

-- Direct messages
CREATE TABLE direct_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT        NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  is_read         BOOLEAN     DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dm_conversation ON direct_messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_dm_sender       ON direct_messages (sender_id);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can see messages" ON direct_messages;
CREATE POLICY "Participants can see messages"
  ON direct_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can send messages" ON direct_messages;
CREATE POLICY "Participants can send messages"
  ON direct_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can mark read" ON direct_messages;
CREATE POLICY "Participants can mark read"
  ON direct_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

GRANT SELECT, INSERT, UPDATE ON direct_messages TO authenticated;
GRANT ALL ON direct_messages TO service_role;

-- -------------------------------------------------------
-- TRIGGER: update conversation last_message + unread count on new message
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conv conversations%ROWTYPE;
BEGIN
  SELECT * INTO v_conv FROM conversations WHERE id = NEW.conversation_id;

  IF v_conv.user1_id = NEW.sender_id THEN
    -- sender is user1, increment user2 unread
    UPDATE conversations SET
      last_message    = LEFT(NEW.content, 100),
      last_message_at = NEW.created_at,
      user2_unread    = user2_unread + 1
    WHERE id = NEW.conversation_id;
  ELSE
    -- sender is user2, increment user1 unread
    UPDATE conversations SET
      last_message    = LEFT(NEW.content, 100),
      last_message_at = NEW.created_at,
      user1_unread    = user1_unread + 1
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_conv_on_msg ON direct_messages;
CREATE TRIGGER trg_update_conv_on_msg
  AFTER INSERT ON direct_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_on_message();

-- -------------------------------------------------------
-- RPC: get or create a conversation between two users
-- Returns the conversation id
-- -------------------------------------------------------
DROP FUNCTION IF EXISTS get_or_create_conversation(UUID);
CREATE OR REPLACE FUNCTION get_or_create_conversation(p_other_user_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me       UUID := auth.uid();
  v_user1    UUID;
  v_user2    UUID;
  v_conv_id  UUID;
BEGIN
  IF v_me = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot message yourself';
  END IF;

  -- Canonical order: smaller UUID first
  IF v_me < p_other_user_id THEN
    v_user1 := v_me; v_user2 := p_other_user_id;
  ELSE
    v_user1 := p_other_user_id; v_user2 := v_me;
  END IF;

  SELECT id INTO v_conv_id FROM conversations WHERE user1_id = v_user1 AND user2_id = v_user2;

  IF v_conv_id IS NULL THEN
    INSERT INTO conversations (user1_id, user2_id)
    VALUES (v_user1, v_user2)
    RETURNING id INTO v_conv_id;
  END IF;

  RETURN v_conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID) TO authenticated;

-- -------------------------------------------------------
-- RPC: mark messages in a conversation as read
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me UUID := auth.uid();
  v_conv conversations%ROWTYPE;
BEGIN
  SELECT * INTO v_conv FROM conversations WHERE id = p_conversation_id;

  IF v_conv.id IS NULL THEN RETURN; END IF;
  IF v_conv.user1_id != v_me AND v_conv.user2_id != v_me THEN
    RAISE EXCEPTION 'Not a participant';
  END IF;

  -- Mark messages from the other person as read
  UPDATE direct_messages
  SET is_read = TRUE
  WHERE conversation_id = p_conversation_id
    AND sender_id != v_me
    AND is_read = FALSE;

  -- Reset unread count for this user
  IF v_conv.user1_id = v_me THEN
    UPDATE conversations SET user1_unread = 0 WHERE id = p_conversation_id;
  ELSE
    UPDATE conversations SET user2_unread = 0 WHERE id = p_conversation_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_conversation_read(UUID) TO authenticated;

-- -------------------------------------------------------
-- View: my_conversations — returns conversations with other user's profile
-- -------------------------------------------------------
CREATE OR REPLACE VIEW my_conversations AS
SELECT
  c.id,
  c.last_message,
  c.last_message_at,
  CASE WHEN c.user1_id = auth.uid() THEN c.user2_id ELSE c.user1_id END AS other_user_id,
  CASE WHEN c.user1_id = auth.uid() THEN c.user1_unread ELSE c.user2_unread END AS my_unread,
  u.full_name   AS other_name,
  u.username    AS other_username,
  u.avatar_url  AS other_avatar,
  c.created_at
FROM conversations c
JOIN users u ON u.id = CASE WHEN c.user1_id = auth.uid() THEN c.user2_id ELSE c.user1_id END
WHERE c.user1_id = auth.uid() OR c.user2_id = auth.uid();

GRANT SELECT ON my_conversations TO authenticated;
