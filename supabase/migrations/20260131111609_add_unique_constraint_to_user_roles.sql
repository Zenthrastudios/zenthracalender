-- Add unique constraint to user_roles on user_id to support ON CONFLICT upserts
-- First, ensure there are no duplicates (keep the most recent role if duplicates exist?? or just any)
-- Ideally user_id should be unique in user_roles if a user can only have one primary role.
-- If user_roles was designed to allow multiple roles, then the Primary Key should be (user_id, role).
-- Based on the error "there is no unique or exclusion constraint matching the ON CONFLICT specification", 
-- the code is doing `.upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id' })`
-- This implies the intention is that a user corresponds to ONE row in user_roles.

-- So we will make user_id unique.

BEGIN;

-- Remove duplicates if any (keeping the one with 'admin' role if available, or just random)
DELETE FROM user_roles a USING user_roles b
WHERE a.id < b.id AND a.user_id = b.user_id;

-- Add absolute constraint
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

COMMIT;
