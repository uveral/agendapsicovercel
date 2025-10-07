-- Fix users table to allow creating clients without auth accounts
-- This removes the foreign key constraint that required every user to have an auth.users record

-- Drop the foreign key constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Add default UUID generation for id column
ALTER TABLE users ALTER COLUMN id SET DEFAULT uuid_generate_v4();
