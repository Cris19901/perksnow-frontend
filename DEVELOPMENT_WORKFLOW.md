# Development Workflow & Safety Checklist

## Pre-Development Checklist
- [ ] Feature has clear requirements
- [ ] Rollback plan documented
- [ ] Test data/users identified
- [ ] Feature flag planned (if needed)

## Development Process

### 1. Create Feature Branch
```bash
git checkout -b feature/[feature-name]
```

### 2. Development Phase
- [ ] Write code
- [ ] Test locally
- [ ] Add error handling
- [ ] Add logging for debugging

### 3. Database Changes
For any database migration, create TWO files:

**Migration (up):**
```sql
-- supabase/migrations/[timestamp]_[feature_name].sql
-- Add your changes here
```

**Rollback (down):**
```sql
-- supabase/migrations/[timestamp]_[feature_name]_rollback.sql
-- Reverse your changes here
```

### 4. Testing Checklist
- [ ] Test with fresh data
- [ ] Test with existing data
- [ ] Test error cases
- [ ] Test edge cases
- [ ] Verify rollback works

### 5. Deployment Checklist
- [ ] Code reviewed
- [ ] Tests passing
- [ ] Rollback script ready
- [ ] Feature flag enabled (if applicable)
- [ ] Monitor logs for errors

### 6. Post-Deployment
- [ ] Verify in production
- [ ] Monitor error rates (first 24h)
- [ ] Check user feedback
- [ ] Document any issues

## Feature Flag System

Add to your database:
```sql
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Emergency Rollback Procedure

If something breaks in production:

1. **Disable feature flag** (if applicable)
   ```sql
   UPDATE feature_flags SET enabled = false WHERE name = 'feature_name';
   ```

2. **Run rollback migration**
   ```bash
   psql [connection_string] < supabase/migrations/[timestamp]_[feature_name]_rollback.sql
   ```

3. **Redeploy previous version**
   ```bash
   git revert [commit_hash]
   git push origin main
   ```

## Current Active Features

| Feature | Status | Flag Name | Enabled |
|---------|--------|-----------|---------|
| Payment System | ✅ Live | - | - |
| Auto-Expiry | ✅ Live | - | - |

## Notes
- Always test with non-production users first
- Keep error logs for 30 days minimum
- Document all breaking changes
