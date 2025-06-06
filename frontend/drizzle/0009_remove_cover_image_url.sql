-- Migration to remove cover_image_url column from users table
-- This removes the column that was accidentally added and not properly rolled back

ALTER TABLE "users" DROP COLUMN IF EXISTS "cover_image_url";