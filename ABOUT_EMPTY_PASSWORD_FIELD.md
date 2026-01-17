# About Empty Password Field in Supabase Auth

## This is NORMAL and EXPECTED ✅

### Why is the password field empty?

In Supabase's Authentication dashboard, you'll see user records like this:

```
Email: user@example.com
Password: [empty/blank]
Created: 2024-01-08
```

**This is by design for security!**

### Explanation:

1. **Passwords are HASHED**, not stored in plain text
2. The actual hashed password is stored in a different internal table (`auth.users`)
3. Supabase Dashboard intentionally HIDES the hash for security
4. You should NEVER see actual passwords or hashes in the dashboard

### How to verify password works:

**Test 1: Try to login**
```typescript
// If this works, password is stored correctly
await signIn({ email: 'user@example.com', password: 'their-password' })
```

**Test 2: Check auth.users table**
```sql
-- This will show if password hash exists (don't actually run this in production)
SELECT
    email,
    encrypted_password IS NOT NULL as has_password,
    LENGTH(encrypted_password) as password_hash_length
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Expected: has_password = true, password_hash_length > 50
```

### What if login doesn't work?

If you created a user but can't login, it might be because:

1. **Email confirmation required** (check Supabase Auth settings)
2. **Wrong password** (password was set correctly but you're entering wrong one)
3. **User not in auth.users** (profile created but auth failed)

### Summary:

**Empty password field = NORMAL** ✅

- Passwords are hashed and hidden for security
- If you can login, everything is working correctly
- Never expect to see passwords in the dashboard

---

## Real Issue: Signup Bonus Not Working

The empty password field is NOT your problem. Your real issue is:

**Signup bonus points are not being added to users**

To diagnose this, run: `DIAGNOSE_SIGNUP_ISSUE.sql`

This will tell you exactly what's missing (likely the trigger or tables).
