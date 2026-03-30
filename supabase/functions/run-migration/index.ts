import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    // Connect directly to the Postgres database
    const dbUrl = Deno.env.get('SUPABASE_DB_URL') ?? ''

    if (!dbUrl) {
      // Fallback: construct from known project info
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const ref = supabaseUrl.replace('https://', '').split('.')[0]
    }

    // Use the postgres module available in Supabase Edge Functions
    const { default: postgres } = await import('https://deno.land/x/postgresjs@v3.4.4/mod.js')

    const sql = postgres(dbUrl, {
      max: 1,
      idle_timeout: 5,
    })

    const results: string[] = []

    // 1. Fix subscription_plans permissions
    try {
      await sql`GRANT ALL ON subscription_plans TO service_role`
      await sql`GRANT SELECT ON subscription_plans TO authenticated`
      results.push('Fixed subscription_plans permissions')
    } catch (e: any) {
      results.push(`Perms error: ${e.message}`)
    }

    // 2. Add/update weekly plan
    try {
      await sql`
        INSERT INTO subscription_plans (name, display_name, description, price_monthly, price_yearly, currency, features, limits, sort_order, is_active)
        VALUES (
          'weekly', 'Weekly', 'Best budget option - 7 days full access', 1000, 0, 'NGN',
          '{"can_post": true, "can_comment": true, "can_like": true, "can_follow": true, "can_withdraw": true, "verified_badge": false}'::jsonb,
          '{"max_posts_per_day": 20, "max_comments_per_day": 25, "unlimited_likes": true, "duration_days": 7}'::jsonb,
          3, true
        )
        ON CONFLICT (name) DO UPDATE SET
          display_name = 'Weekly',
          description = 'Best budget option - 7 days full access',
          price_monthly = 1000,
          features = '{"can_post": true, "can_comment": true, "can_like": true, "can_follow": true, "can_withdraw": true, "verified_badge": false}'::jsonb,
          limits = '{"max_posts_per_day": 20, "max_comments_per_day": 25, "unlimited_likes": true, "duration_days": 7}'::jsonb,
          sort_order = 3,
          is_active = true
      `
      results.push('Weekly plan added/updated')
    } catch (e: any) {
      results.push(`Weekly plan error: ${e.message}`)
    }

    // 3. Fix sort orders
    try {
      await sql`UPDATE subscription_plans SET sort_order = 4 WHERE name = 'starter'`
      await sql`UPDATE subscription_plans SET sort_order = 5 WHERE name = 'basic'`
      await sql`UPDATE subscription_plans SET sort_order = 6 WHERE name = 'pro'`
      results.push('Sort orders updated')
    } catch (e: any) {
      results.push(`Sort order error: ${e.message}`)
    }

    // 4. Add two_factor_enabled column
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE`
      results.push('Added two_factor_enabled column')
    } catch (e: any) {
      results.push(`2FA column error: ${e.message}`)
    }

    // 5. Create post_reads table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS post_reads (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          post_id BIGINT NOT NULL,
          read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          duration_seconds INTEGER DEFAULT 0,
          points_awarded BOOLEAN DEFAULT FALSE
        )
      `
      await sql`GRANT ALL ON post_reads TO authenticated`
      await sql`GRANT ALL ON post_reads TO service_role`
      await sql`ALTER TABLE post_reads ENABLE ROW LEVEL SECURITY`
      await sql`
        DO $$ BEGIN
          CREATE POLICY "Users can insert their own reads" ON post_reads FOR INSERT WITH CHECK (auth.uid() = user_id);
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
      `
      await sql`
        DO $$ BEGIN
          CREATE POLICY "Users can read their own reads" ON post_reads FOR SELECT USING (auth.uid() = user_id);
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
      `
      results.push('Created post_reads table')
    } catch (e: any) {
      results.push(`post_reads error: ${e.message}`)
    }

    // 6. Create OTP table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS otp_codes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          code TEXT NOT NULL,
          purpose TEXT NOT NULL CHECK (purpose IN ('login_2fa', 'withdrawal')),
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          verified BOOLEAN DEFAULT FALSE,
          attempts INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
      await sql`GRANT ALL ON otp_codes TO authenticated`
      await sql`GRANT ALL ON otp_codes TO service_role`
      await sql`ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY`
      await sql`
        DO $$ BEGIN
          CREATE POLICY "Users manage own OTPs" ON otp_codes FOR ALL USING (auth.uid() = user_id);
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
      `
      results.push('Created otp_codes table')
    } catch (e: any) {
      results.push(`OTP error: ${e.message}`)
    }

    // 7. Create RPC functions
    try {
      await sql`
        CREATE OR REPLACE FUNCTION award_reading_points(p_user_id UUID, p_post_id BIGINT, p_duration_seconds INTEGER DEFAULT 15)
        RETURNS JSONB AS $fn$
        DECLARE
          v_points INTEGER := 5;
          v_reads_today INTEGER;
          v_already_read BOOLEAN;
          v_earning_unlocked BOOLEAN;
        BEGIN
          SELECT COALESCE((SELECT TRUE FROM users WHERE id = p_user_id AND COALESCE(subscription_tier, 'free') != 'free'), FALSE) INTO v_earning_unlocked;
          IF NOT v_earning_unlocked THEN RETURN jsonb_build_object('success', false, 'reason', 'earning_locked'); END IF;

          SELECT EXISTS(SELECT 1 FROM post_reads WHERE user_id = p_user_id AND post_id = p_post_id AND read_at::date = CURRENT_DATE AND points_awarded = TRUE) INTO v_already_read;
          IF v_already_read THEN RETURN jsonb_build_object('success', false, 'reason', 'already_read'); END IF;

          SELECT COUNT(*) INTO v_reads_today FROM post_reads WHERE user_id = p_user_id AND read_at::date = CURRENT_DATE AND points_awarded = TRUE;
          IF v_reads_today >= 20 THEN RETURN jsonb_build_object('success', false, 'reason', 'daily_limit'); END IF;

          INSERT INTO post_reads (user_id, post_id, duration_seconds, points_awarded) VALUES (p_user_id, p_post_id, p_duration_seconds, TRUE);
          UPDATE users SET points_balance = COALESCE(points_balance, 0) + v_points WHERE id = p_user_id;
          INSERT INTO points_transactions (user_id, points, transaction_type, activity, source, description, reference_id, reference_type) VALUES (p_user_id, v_points, 'earn', 'post_read', 'engagement', 'Read a post for 15+ seconds', p_post_id::text, 'post');

          RETURN jsonb_build_object('success', true, 'points', v_points, 'reads_today', v_reads_today + 1);
        END;
        $fn$ LANGUAGE plpgsql SECURITY DEFINER
      `
      await sql`GRANT EXECUTE ON FUNCTION award_reading_points TO authenticated`
      results.push('Created award_reading_points function')
    } catch (e: any) {
      results.push(`award_reading_points error: ${e.message}`)
    }

    try {
      await sql`
        CREATE OR REPLACE FUNCTION award_quality_comment_points(p_user_id UUID, p_comment_id UUID, p_comment_text TEXT)
        RETURNS JSONB AS $fn$
        DECLARE
          v_points INTEGER := 40;
          v_word_count INTEGER;
          v_clean_text TEXT;
          v_is_duplicate BOOLEAN;
          v_earning_unlocked BOOLEAN;
          v_spam_phrases TEXT[] := ARRAY['nice','cool','wow','lol','first','great','awesome','good','ok','okay','thanks','thank you','love it','beautiful','amazing','yes','no','haha','lmao','bruh','fire','lit','facts','true','same'];
        BEGIN
          SELECT COALESCE((SELECT TRUE FROM users WHERE id = p_user_id AND COALESCE(subscription_tier, 'free') != 'free'), FALSE) INTO v_earning_unlocked;
          IF NOT v_earning_unlocked THEN RETURN jsonb_build_object('success', false, 'reason', 'earning_locked'); END IF;

          IF length(trim(p_comment_text)) < 25 THEN RETURN jsonb_build_object('success', false, 'reason', 'too_short'); END IF;

          v_clean_text := regexp_replace(p_comment_text, '[^\w\s]', '', 'g');
          v_clean_text := trim(regexp_replace(v_clean_text, '\s+', ' ', 'g'));

          IF v_clean_text = '' OR v_clean_text IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'pure_emoji'); END IF;

          v_word_count := array_length(string_to_array(v_clean_text, ' '), 1);
          IF v_word_count IS NULL OR v_word_count < 5 THEN RETURN jsonb_build_object('success', false, 'reason', 'too_few_words'); END IF;

          IF length(v_clean_text) < 10 THEN RETURN jsonb_build_object('success', false, 'reason', 'low_quality'); END IF;

          IF lower(trim(p_comment_text)) = ANY(v_spam_phrases) THEN RETURN jsonb_build_object('success', false, 'reason', 'spam_phrase'); END IF;

          SELECT EXISTS(SELECT 1 FROM post_comments WHERE user_id = p_user_id AND id != p_comment_id AND content = p_comment_text AND created_at > NOW() - INTERVAL '24 hours' LIMIT 1) INTO v_is_duplicate;
          IF v_is_duplicate THEN RETURN jsonb_build_object('success', false, 'reason', 'duplicate'); END IF;

          UPDATE users SET points_balance = COALESCE(points_balance, 0) + v_points WHERE id = p_user_id;
          INSERT INTO points_transactions (user_id, points, transaction_type, activity, source, description, reference_id, reference_type) VALUES (p_user_id, v_points, 'earn', 'quality_comment', 'engagement', 'Quality comment reward', p_comment_id::text, 'comment');

          RETURN jsonb_build_object('success', true, 'points', v_points);
        END;
        $fn$ LANGUAGE plpgsql SECURITY DEFINER
      `
      await sql`GRANT EXECUTE ON FUNCTION award_quality_comment_points TO authenticated`
      results.push('Created award_quality_comment_points function')
    } catch (e: any) {
      results.push(`award_quality_comment_points error: ${e.message}`)
    }

    try {
      await sql`
        CREATE OR REPLACE FUNCTION generate_otp(p_user_id UUID, p_purpose TEXT)
        RETURNS JSONB AS $fn$
        DECLARE v_code TEXT; v_email TEXT; v_expires TIMESTAMP WITH TIME ZONE;
        BEGIN
          v_code := lpad(floor(random() * 1000000)::text, 6, '0');
          v_expires := NOW() + INTERVAL '10 minutes';
          SELECT email INTO v_email FROM users WHERE id = p_user_id;
          IF v_email IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'User not found'); END IF;
          DELETE FROM otp_codes WHERE user_id = p_user_id AND purpose = p_purpose AND verified = FALSE;
          INSERT INTO otp_codes (user_id, email, code, purpose, expires_at) VALUES (p_user_id, v_email, v_code, p_purpose, v_expires);
          RETURN jsonb_build_object('success', true, 'email', v_email, 'code', v_code, 'expires_at', v_expires);
        END;
        $fn$ LANGUAGE plpgsql SECURITY DEFINER
      `
      await sql`GRANT EXECUTE ON FUNCTION generate_otp TO authenticated`
      results.push('Created generate_otp function')
    } catch (e: any) {
      results.push(`generate_otp error: ${e.message}`)
    }

    try {
      await sql`
        CREATE OR REPLACE FUNCTION verify_otp(p_user_id UUID, p_code TEXT, p_purpose TEXT)
        RETURNS JSONB AS $fn$
        DECLARE v_otp RECORD;
        BEGIN
          SELECT * INTO v_otp FROM otp_codes WHERE user_id = p_user_id AND purpose = p_purpose AND verified = FALSE ORDER BY created_at DESC LIMIT 1;
          IF v_otp IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'No OTP found. Please request a new code.'); END IF;
          IF v_otp.expires_at < NOW() THEN RETURN jsonb_build_object('success', false, 'error', 'OTP has expired. Please request a new code.'); END IF;
          IF v_otp.attempts >= 5 THEN RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please request a new code.'); END IF;
          UPDATE otp_codes SET attempts = attempts + 1 WHERE id = v_otp.id;
          IF v_otp.code != p_code THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid code. Please try again.'); END IF;
          UPDATE otp_codes SET verified = TRUE WHERE id = v_otp.id;
          RETURN jsonb_build_object('success', true);
        END;
        $fn$ LANGUAGE plpgsql SECURITY DEFINER
      `
      await sql`GRANT EXECUTE ON FUNCTION verify_otp TO authenticated`
      results.push('Created verify_otp function')
    } catch (e: any) {
      results.push(`verify_otp error: ${e.message}`)
    }

    // 8. Admin audit log viewer RPC
    try {
      await sql`
        CREATE OR REPLACE FUNCTION get_admin_audit_logs(p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0, p_action TEXT DEFAULT NULL)
        RETURNS TABLE (id UUID, admin_id UUID, admin_username TEXT, action TEXT, target_user_id UUID, target_username TEXT, details JSONB, created_at TIMESTAMPTZ)
        AS $fn$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin') THEN RAISE EXCEPTION 'Access denied'; END IF;
          RETURN QUERY SELECT al.id, al.admin_id, au.username AS admin_username, al.action, al.target_user_id, tu.username AS target_username, al.details, al.created_at
          FROM admin_audit_log al LEFT JOIN users au ON au.id = al.admin_id LEFT JOIN users tu ON tu.id = al.target_user_id
          WHERE (p_action IS NULL OR al.action = p_action) ORDER BY al.created_at DESC LIMIT p_limit OFFSET p_offset;
        END;
        $fn$ LANGUAGE plpgsql SECURITY DEFINER
      `
      await sql`GRANT EXECUTE ON FUNCTION get_admin_audit_logs TO authenticated`
      results.push('Created get_admin_audit_logs function')
    } catch (e: any) {
      results.push(`get_admin_audit_logs error: ${e.message}`)
    }

    await sql.end()

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message, stack: error.stack }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
