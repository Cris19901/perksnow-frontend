/**
 * User Migration Script - Sngine to Supabase
 *
 * This script migrates users from Sngine MySQL database to Supabase
 *
 * Prerequisites:
 * 1. Export users from Sngine to users.csv
 * 2. Install dependencies: npm install csv-parser mysql2 @supabase/supabase-js
 * 3. Configure database connections below
 */

import fs from 'fs';
import csv from 'csv-parser';
import mysql from 'mysql2/promise';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from both root .env and Perksnowv2/.env.local
dotenv.config({ path: join(__dirname, '.env') });
dotenv.config({ path: join(__dirname, 'Perksnowv2', '.env.local') });

// Configuration - Read MySQL credentials from environment variables
const SNGINE_DB_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
};

// Validate MySQL configuration
if (!SNGINE_DB_CONFIG.user || !SNGINE_DB_CONFIG.password || !SNGINE_DB_CONFIG.database) {
  console.error('❌ Missing MySQL credentials in .env file');
  console.error('   Please configure: MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE');
  process.exit(1);
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Statistics
const stats = {
  total: 0,
  success: 0,
  failed: 0,
  skipped: 0
};

/**
 * Generate a random password for users
 */
function generateTempPassword() {
  return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
}

/**
 * Migrate a single user
 */
async function migrateUser(sngineUser) {
  try {
    stats.total++;

    console.log(`\n[${stats.total}] Migrating user: ${sngineUser.user_name}`);

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', sngineUser.user_email)
      .single();

    if (existingUser) {
      console.log(`   ⚠️  User already exists, skipping...`);
      stats.skipped++;

      // Log the mapping
      await supabase.from('migration_id_map').insert({
        old_id: sngineUser.user_id,
        new_id: existingUser.id,
        entity_type: 'user'
      });

      return;
    }

    // Create user in Supabase Auth
    const tempPassword = generateTempPassword();

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: sngineUser.user_email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username: sngineUser.user_name,
        full_name: `${sngineUser.user_firstname || ''} ${sngineUser.user_lastname || ''}`.trim(),
        migrated_from_sngine: true,
        needs_password_reset: true
      }
    });

    if (authError) {
      console.error(`   ❌ Auth error:`, authError.message);
      await logError('user', sngineUser.user_id, null, authError.message);
      stats.failed++;
      return;
    }

    // Create user profile in users table
    const { data: profileUser, error: profileError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: sngineUser.user_email,
        username: sngineUser.user_name,
        full_name: `${sngineUser.user_firstname || ''} ${sngineUser.user_lastname || ''}`.trim(),
        avatar_url: sngineUser.user_picture || null,
        cover_url: sngineUser.user_cover || null,
        bio: sngineUser.user_bio || null,
        website: sngineUser.user_website || null,
        location: sngineUser.user_location || null,
        created_at: sngineUser.user_registered || new Date().toISOString(),
        // Note: Images need to be migrated separately to R2
      })
      .select()
      .single();

    if (profileError) {
      console.error(`   ❌ Profile error:`, profileError.message);
      await logError('user', sngineUser.user_id, authUser.user.id, profileError.message);
      stats.failed++;
      return;
    }

    // Store ID mapping
    await supabase.from('migration_id_map').insert({
      old_id: sngineUser.user_id,
      new_id: authUser.user.id,
      entity_type: 'user'
    });

    // Log success
    await supabase.from('migration_log').insert({
      entity_type: 'user',
      status: 'success',
      old_id: sngineUser.user_id,
      new_id: authUser.user.id
    });

    console.log(`   ✅ Success! New ID: ${authUser.user.id}`);
    console.log(`   📧 Temp password: ${tempPassword}`);

    // Save temp password to file for password reset emails
    fs.appendFileSync(
      'temp-passwords.txt',
      `${sngineUser.user_email},${tempPassword}\n`
    );

    stats.success++;

  } catch (err) {
    console.error(`   ❌ Unexpected error:`, err);
    await logError('user', sngineUser.user_id, null, err.message);
    stats.failed++;
  }
}

/**
 * Log migration error
 */
async function logError(entityType, oldId, newId, errorMessage) {
  await supabase.from('migration_log').insert({
    entity_type: entityType,
    status: 'failed',
    old_id: oldId,
    new_id: newId,
    error_message: errorMessage
  });
}

/**
 * Main migration function
 */
async function migrateUsers() {
  console.log('🚀 Starting User Migration from Sngine to Supabase\n');
  console.log('=' . repeat(60));

  try {
    // Connect to Sngine database
    const connection = await mysql.createConnection(SNGINE_DB_CONFIG);
    console.log('✅ Connected to Sngine database\n');

    // Fetch users from Sngine
    const [rows] = await connection.execute(`
      SELECT
        user_id,
        user_name,
        user_email,
        user_firstname,
        user_lastname,
        user_picture,
        user_cover,
        user_bio,
        user_website,
        user_location,
        user_registered
      FROM users
      ORDER BY user_id ASC
      LIMIT 500
    `);

    console.log(`📊 Found ${rows.length} users to migrate\n`);

    // Migrate users one by one
    for (const user of rows) {
      await migrateUser(user);

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await connection.end();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total users: ${stats.total}`);
    console.log(`✅ Successfully migrated: ${stats.success}`);
    console.log(`⚠️  Skipped (already exist): ${stats.skipped}`);
    console.log(`❌ Failed: ${stats.failed}`);
    console.log('='.repeat(60));
    console.log('\n📝 Temporary passwords saved to: temp-passwords.txt');
    console.log('   Use this file to send password reset emails\n');

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

// Run migration
migrateUsers();
