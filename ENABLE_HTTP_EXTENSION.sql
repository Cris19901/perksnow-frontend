-- Enable pg_net extension for HTTP requests
-- Run this FIRST in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Verify it's enabled
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- You should see a row showing pg_net is installed
-- After this completes, run the TEST_EMAIL_FUNCTION.sql
