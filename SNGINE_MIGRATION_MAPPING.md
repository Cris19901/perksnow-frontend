# Sngine to Current Schema Migration Mapping

## Overview
This document maps Sngine database schema fields to the current PerkSnow schema.

## Users Table Mapping

### Direct Field Mappings
| Sngine Field | Current Field | Transformation | Notes |
|--------------|---------------|----------------|-------|
| `user_id` (int) | `id` (UUID) | Generate new UUID | Create mapping table for ID relationships |
| `user_name` | `username` | Direct copy | Must ensure uniqueness |
| `user_email` | `email` | Direct copy | Must ensure uniqueness |
| `user_firstname` + `user_lastname` | `full_name` | Concatenate with space | Handle NULL values |
| `user_biography` | `bio` | Direct copy | NULL if empty |
| `user_picture` | `avatar_url` | URL transformation | May need to migrate files |
| `user_cover` | `cover_image_url` | URL transformation | May need to migrate files |
| `user_current_city` | `location` | Direct copy | NULL if empty |
| `user_website` | `website` | Direct copy | NULL if empty |
| `user_verified` ('0'/'1') | `is_verified` (boolean) | Convert '1' to true, '0' to false | |
| `user_registered` | `created_at` | Direct copy | Timestamp conversion |
| `user_last_seen` | `updated_at` | Direct copy | Timestamp conversion |

### Calculated/Default Fields
| Current Field | Value | Notes |
|---------------|-------|-------|
| `points_balance` | 0 | Default - users start fresh |
| `followers_count` | 0 or calculated | Can calculate from `followings` table |
| `following_count` | 0 or calculated | Can calculate from `followings` table |
| `posts_count` | 0 or calculated | Can calculate from `posts` table |

### Skipped Fields
- `user_password` - Users will need to reset passwords via email
- `user_group`, `user_demo` - Not needed in new system
- Privacy settings - Not in current schema
- Social media links - Not in current schema
- All notification/live counters - Not needed

## Posts Table Mapping

### Direct Field Mappings
| Sngine Field | Current Field | Transformation | Notes |
|--------------|---------------|----------------|-------|
| `post_id` (int) | `id` (UUID) | Generate new UUID | Store mapping for comments/likes |
| `user_id` (int) | `user_id` (UUID) | Map via user ID mapping | |
| `text` | `content` | Direct copy | NULL if empty |
| `time` | `created_at` | Direct copy | Timestamp conversion |
| `time` | `updated_at` | Direct copy | Same as created_at |
| `comments` | `comments_count` | Direct copy | |
| `shares` | `shares_count` | Direct copy | |
| `views` | - | Skip | Not in current schema |

### Post Type Handling
| Sngine post_type | Handling Strategy |
|------------------|-------------------|
| 'photos' | Get image from `posts_photos` table → `image_url` |
| 'video' | Store video URL in `content` with text or skip |
| 'article' | Get from `posts_articles` table, combine title + text → `content` |
| 'link' | Keep text in `content` |
| 'reel' | Skip or store as video |
| 'profile_picture' | Skip - already in users table |
| 'profile_cover' | Skip - already in users table |
| '' (empty) | Text-only post |

### Reaction Counts
| Sngine Fields | Current Field | Transformation |
|---------------|---------------|----------------|
| `reaction_like_count` + `reaction_love_count` + `reaction_haha_count` + `reaction_yay_count` + `reaction_wow_count` + `reaction_sad_count` + `reaction_angry_count` | `likes_count` | Sum all reactions |

### Skipped Fields
- `user_type`, `in_group`, `group_id`, `in_event`, `event_id` - Not in current schema
- `wall_id`, `in_wall` - Not needed
- `privacy` - Not in current schema
- `boosted`, `is_paid` - Not in current schema
- Individual reaction counts - Combined into likes_count
- `location`, `latitude`, `longitude` - Not in current schema
- `processing`, `pre_approved`, `has_approved` - Not needed

## Migration Strategy

### Phase 1: Preparation
1. Create ID mapping table (`sngine_id_mappings`)
2. Analyze data for conflicts (duplicate usernames/emails)
3. Backup current database

### Phase 2: User Migration
1. Insert users with new UUIDs
2. Store old_id → new_id mapping
3. Handle duplicate usernames/emails with suffix
4. Set passwords to NULL (users reset via email)

### Phase 3: Posts Migration
1. Migrate posts referencing mapped user IDs
2. Fetch and attach images from related tables
3. Combine reaction counts
4. Skip profile picture/cover posts (already migrated)

### Phase 4: Relationships (Optional)
1. Migrate followers from `followings` table
2. Migrate post likes from `posts_reactions` table
3. Migrate comments from `posts_comments` table

### Phase 5: Cleanup
1. Verify data integrity
2. Update user post counts
3. Generate password reset emails for migrated users
