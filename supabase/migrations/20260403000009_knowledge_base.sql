-- Knowledge base for AI support RAG system

CREATE TABLE IF NOT EXISTS knowledge_base (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  content      TEXT        NOT NULL,
  category     TEXT        NOT NULL DEFAULT 'general',
  tags         TEXT[]      DEFAULT '{}',
  is_published BOOLEAN     DEFAULT TRUE,
  search_vector TSVECTOR,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_search_vector ON knowledge_base USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_kb_category      ON knowledge_base (category);
CREATE INDEX IF NOT EXISTS idx_kb_published     ON knowledge_base (is_published) WHERE is_published = TRUE;

-- Trigger function to maintain search_vector (can't use GENERATED ALWAYS AS because
-- to_tsvector(regconfig, text) is STABLE not IMMUTABLE in Supabase's PostgreSQL)
CREATE OR REPLACE FUNCTION update_kb_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('pg_catalog.english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('pg_catalog.english', coalesce(NEW.content, '')), 'B') ||
    setweight(to_tsvector('pg_catalog.english', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kb_search_vector ON knowledge_base;
CREATE TRIGGER trg_kb_search_vector
  BEFORE INSERT OR UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_kb_search_vector();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_kb_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_kb_updated_at ON knowledge_base;
CREATE TRIGGER trg_kb_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_kb_timestamp();

-- RLS: anyone can read published articles, only admins can write
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published KB articles" ON knowledge_base;
CREATE POLICY "Anyone can read published KB articles"
  ON knowledge_base FOR SELECT
  USING (is_published = TRUE);

DROP POLICY IF EXISTS "Admins can manage KB articles" ON knowledge_base;
CREATE POLICY "Admins can manage KB articles"
  ON knowledge_base FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

GRANT SELECT ON knowledge_base TO authenticated, anon;
GRANT ALL    ON knowledge_base TO service_role;

-- Search function: returns top N articles ranked by relevance
CREATE OR REPLACE FUNCTION search_knowledge_base(
  p_query    TEXT,
  p_limit    INT  DEFAULT 3,
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id       UUID,
  title    TEXT,
  content  TEXT,
  category TEXT,
  rank     REAL
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.title,
    k.content,
    k.category,
    ts_rank(k.search_vector, websearch_to_tsquery('pg_catalog.english', p_query)) AS rank
  FROM knowledge_base k
  WHERE
    k.is_published = TRUE
    AND k.search_vector @@ websearch_to_tsquery('pg_catalog.english', p_query)
    AND (p_category IS NULL OR k.category = p_category)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_knowledge_base(TEXT, INT, TEXT) TO authenticated, anon, service_role;
