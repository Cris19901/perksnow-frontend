import { supabase } from './supabase';
import { sendSignupBonusEmail } from './email';

export interface SignUpData {
  email: string;
  password: string;
  username: string;
  full_name?: string;
  phone_number?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

/**
 * Sign up a new user
 */
export const signUp = async ({ email, password, username, full_name, phone_number }: SignUpData) => {
  try {
    // 1. Check if username already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      throw new Error('Username already taken. Please choose a different username.');
    }

    // 2. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name,
          phone_number,
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user returned from signup');

    // 3. Create user profile in users table (upsert to avoid duplicates)
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: authData.user.id,
        email,
        username,
        full_name: full_name || null,
        phone_number: phone_number || null,
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      // Log the exact error for debugging
      console.error('Profile creation error:', profileError);
      console.error('Error details:', {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint
      });

      // If profile creation fails, try to delete the auth user to maintain consistency
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});

      throw new Error(`Database error saving new user: ${profileError.message}`);
    }

    // 4. Send welcome email with bonus info
    // Don't await this - let it run in background
    setTimeout(async () => {
      try {
        console.log('🔍 [SIGNUP] Checking for signup bonus...');

        // Retry logic to wait for trigger to complete
        let bonusData = null;
        let attempts = 0;
        const maxAttempts = 5;

        while (!bonusData && attempts < maxAttempts) {
          attempts++;
          console.log(`🔍 [SIGNUP] Attempt ${attempts}/${maxAttempts} to find bonus...`);

          const { data, error } = await supabase
            .from('signup_bonus_history')
            .select('bonus_amount, email_sent')
            .eq('user_id', authData.user.id)
            .maybeSingle();

          if (error) {
            console.error('❌ [SIGNUP] Error querying bonus:', error);
            break;
          }

          if (data) {
            bonusData = data;
            console.log('✅ [SIGNUP] Bonus found:', data);
            break;
          }

          // Wait before retry
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        if (!bonusData) {
          console.warn('⚠️ [SIGNUP] No signup bonus found after', maxAttempts, 'attempts');
          console.log('💡 [SIGNUP] System might be disabled or trigger not firing');
          return;
        }

        const bonusAmount = bonusData.bonus_amount;

        console.log(`📧 [SIGNUP] Sending welcome email with ${bonusAmount} points bonus...`);

        // Send welcome email with bonus
        const emailResult = await sendSignupBonusEmail(
          email,
          full_name || username,
          bonusAmount
        );

        console.log('📧 [SIGNUP] Email send result:', emailResult);

        if (emailResult.success) {
          console.log('✅ [SIGNUP] Welcome email sent successfully');

          // Mark email as sent in database
          if (!bonusData.email_sent) {
            const { error: markError } = await supabase.rpc('mark_bonus_email_sent', {
              p_user_id: authData.user.id
            });

            if (markError) {
              console.error('⚠️ [SIGNUP] Failed to mark email as sent:', markError);
            } else {
              console.log('✅ [SIGNUP] Email marked as sent in database');
            }
          }
        } else {
          console.error('❌ [SIGNUP] Failed to send welcome email:', emailResult.error);
        }
      } catch (err: any) {
        console.error('❌ [SIGNUP] Error in email sending process:', err);
        console.error('❌ [SIGNUP] Error message:', err.message);
        console.error('❌ [SIGNUP] Stack trace:', err.stack);
      }
    }, 2000); // Start checking after 2 seconds

    return { user: authData.user, session: authData.session };
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

/**
 * Sign in an existing user
 */
export const signIn = async ({ email, password }: SignInData) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { user: data.user, session: data.session };
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Get the current user
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Get the current session
 */
export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback: (user: any) => void) => {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
};
