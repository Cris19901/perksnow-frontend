import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface DailyLimits {
  tier: string;
  posts_used: number;
  posts_limit: number;
  posts_remaining: number;
  comments_used: number;
  comments_limit: number;
  comments_remaining: number;
  can_post: boolean;
  can_comment: boolean;
}

const DEFAULT_LIMITS: DailyLimits = {
  tier: 'free',
  posts_used: 0,
  posts_limit: 4,
  posts_remaining: 4,
  comments_used: 0,
  comments_limit: 50,
  comments_remaining: 50,
  can_post: true,
  can_comment: true,
};

export function useDailyLimits() {
  const { user } = useAuth();
  const [limits, setLimits] = useState<DailyLimits>(DEFAULT_LIMITS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLimits = useCallback(async () => {
    if (!user?.id) {
      setLimits(DEFAULT_LIMITS);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: rpcError } = await supabase.rpc('get_user_daily_limits', {
        p_user_id: user.id
      });

      if (rpcError) throw rpcError;

      if (data) {
        setLimits(data);
      }
    } catch (err: any) {
      console.error('Error fetching daily limits:', err);
      setError(err.message);
      // Fallback to default limits
      setLimits(DEFAULT_LIMITS);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const checkCanPost = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase.rpc('can_user_post', {
        p_user_id: user.id
      });

      if (error) throw error;
      return data ?? false;
    } catch (err) {
      console.error('Error checking post limit:', err);
      return false;
    }
  }, [user?.id]);

  const checkCanComment = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase.rpc('can_user_comment', {
        p_user_id: user.id
      });

      if (error) throw error;
      return data ?? false;
    } catch (err) {
      console.error('Error checking comment limit:', err);
      return false;
    }
  }, [user?.id]);

  const incrementPostCount = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase.rpc('increment_post_count', {
        p_user_id: user.id
      });

      if (error) throw error;

      // Refresh limits after increment
      await fetchLimits();
      return data ?? true;
    } catch (err) {
      console.error('Error incrementing post count:', err);
      return false;
    }
  }, [user?.id, fetchLimits]);

  const incrementCommentCount = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase.rpc('increment_comment_count', {
        p_user_id: user.id
      });

      if (error) throw error;

      // Refresh limits after increment
      await fetchLimits();
      return data ?? true;
    } catch (err) {
      console.error('Error incrementing comment count:', err);
      return false;
    }
  }, [user?.id, fetchLimits]);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  return {
    limits,
    loading,
    error,
    fetchLimits,
    checkCanPost,
    checkCanComment,
    incrementPostCount,
    incrementCommentCount,
  };
}
