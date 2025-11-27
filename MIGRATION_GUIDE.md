# Sngine to Supabase Migration Guide

This guide will help you migrate your data from Sngine (MySQL) to Supabase (PostgreSQL).

## Prerequisites

✅ All dependencies installed (`npm install` has been run)
✅ Migration scripts created (`migrate-users.js`)
✅ `.env` file created with MySQL credentials
✅ `Perksnowv2/.env.local` has Supabase credentials

## Step 1: Configure MySQL Connection

The `.env` file has been created with default values. **You MUST update the MySQL host**:

1. Open `.env` in the root directory
2. Update `MYSQL_HOST` with your actual MySQL server address:
   - If using cPanel hosting: Check "Remote MySQL" or "MySQL Databases" section for the hostname
   - Common formats: `mysql.yourhosting.com`, `db.yourhosting.com`, or an IP address
   - If the database is on the same server where you're running the migration: use `localhost`
3. Verify the other MySQL credentials are correct:
   - `MYSQL_USER`: Database username
   - `MYSQL_PASSWORD`: Database password
   - `MYSQL_DATABASE`: Database name

### Example `.env` configuration:

```env
# If your MySQL is hosted on cPanel
MYSQL_HOST=mysql.example.com
MYSQL_PORT=3306
MYSQL_USER=webcrqml_fadicaue_social
MYSQL_PASSWORD=your_actual_password
MYSQL_DATABASE=webcrqml_fadicaue_social
```

## Step 2: Run SQL Setup in Supabase

Before running the migration script, you need to create the required tables in Supabase:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy and paste the contents of `setup-migration-tables.sql`
6. Click "Run" to execute the SQL

This will create:
- `migration_log` table - tracks migration progress and errors
- `migration_id_map` table - maps old Sngine IDs to new Supabase IDs
- Add columns to `posts` table: `post_type`, `video_url`, `feeling`, `location`

## Step 3: Test MySQL Connection

Before running the full migration, test your MySQL connection:

```bash
node -e "require('mysql2').createConnection({host:process.env.MYSQL_HOST,user:process.env.MYSQL_USER,password:process.env.MYSQL_PASSWORD,database:process.env.MYSQL_DATABASE}).connect((err)=>console.log(err?'❌ '+err.message:'✅ Connected!'))"
```

If you see "✅ Connected!", your MySQL configuration is correct.

## Step 4: Run User Migration

Once the MySQL connection is working:

```bash
node migrate-users.js
```

This will:
- Connect to your old Sngine MySQL database
- Fetch up to 500 users (you can modify the LIMIT in the script)
- Create accounts in Supabase Auth with temporary passwords
- Create user profiles in the `users` table
- Log all successes and failures in `migration_log`
- Save temporary passwords to `temp-passwords.txt`

### What the script does:

1. Checks if each user already exists in Supabase (by email)
2. Creates a Supabase Auth account with a random temporary password
3. Creates a user profile with username, full name, bio, etc.
4. Stores the old ID → new ID mapping in `migration_id_map`
5. Logs the result in `migration_log`

### Migration output:

```
🚀 Starting User Migration from Sngine to Supabase
============================================================
✅ Connected to Sngine database

📊 Found 500 users to migrate

[1] Migrating user: john_doe
   ✅ Success! New ID: 123e4567-e89b-12d3-a456-426614174000
   📧 Temp password: abc123xyz789...

[2] Migrating user: jane_smith
   ⚠️  User already exists, skipping...

...

============================================================
📋 MIGRATION SUMMARY
============================================================
Total users: 500
✅ Successfully migrated: 485
⚠️  Skipped (already exist): 10
❌ Failed: 5
============================================================

📝 Temporary passwords saved to: temp-passwords.txt
```

## Step 5: Review Migration Results

After the migration completes:

1. Check `temp-passwords.txt` for temporary passwords
2. Query `migration_log` in Supabase to see any failures:

```sql
SELECT * FROM migration_log WHERE status = 'failed';
```

3. Check `migration_id_map` to verify ID mappings:

```sql
SELECT COUNT(*) FROM migration_id_map WHERE entity_type = 'user';
```

## Step 6: Send Password Reset Emails

Use the `temp-passwords.txt` file to send password reset instructions to users. You can:

1. Send emails manually using the temp passwords
2. Use the Supabase Auth API to trigger password reset emails
3. Create a script to automate password reset email sending

## Troubleshooting

### Error: "Access denied for user"

- Check that `MYSQL_HOST` is correct (not localhost if database is remote)
- Verify username and password are correct
- Ensure the MySQL user has permissions to connect from your IP address

### Error: "Missing Supabase credentials"

- Ensure `Perksnowv2/.env.local` exists with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Error: "relation 'migration_log' does not exist"

- Run the SQL setup script in Step 2

### Migration is slow

- The script adds a 100ms delay between users to avoid rate limiting
- You can adjust this in `migrate-users.js` line 220

### Some users failed to migrate

- Check `migration_log` table for error messages
- Common issues:
  - Duplicate emails (Supabase requires unique emails)
  - Invalid email formats
  - Missing required fields

## Next Steps

After migrating users, you can migrate other entities:

1. **Posts** - Create `migrate-posts.js` (similar structure)
2. **Products** - Create `migrate-products.js`
3. **Relationships** - Create `migrate-follows.js`
4. **Media Files** - Migrate images/videos from old storage to R2

Each migration script should:
- Use the `migration_id_map` table to maintain relationships
- Log progress to `migration_log`
- Handle duplicates gracefully

## Important Notes

- **Backup First**: Always backup your Sngine database before migration
- **Test on Small Batch**: Modify the LIMIT in the SQL query to test with 10-20 users first
- **Rate Limiting**: The script has built-in delays to avoid Supabase rate limits
- **Temporary Passwords**: All migrated users get random passwords - send reset links
- **Images Not Migrated**: User avatars/covers need separate migration to R2
- **Rollback**: If something goes wrong, delete from `users` table and `migration_log`, then re-run

## Support

If you encounter issues:
1. Check the error message in console output
2. Query `migration_log` for detailed error info
3. Verify database credentials and connections
4. Check Supabase dashboard for API usage and errors
