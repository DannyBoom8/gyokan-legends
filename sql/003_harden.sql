-- Run once on an existing database after 002_leaderboard.sql (fresh projects get this from schema.sql). Safe to run again.

-- 1. Players could insert their own user_ranks row with any points or legend flag and top the leaderboard.
--    Profile and rank rows are now created by a trigger on sign-up; the browser can no longer insert either.
DROP POLICY IF EXISTS "own rank add" ON user_ranks;
DROP POLICY IF EXISTS "own profile"  ON users;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.users (id, username) VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  INSERT INTO public.user_ranks (user_id) VALUES (NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. The same rules the sign-up form shows, enforced where the client can't skip them.
ALTER TABLE users DROP CONSTRAINT IF EXISTS username_format;
ALTER TABLE users ADD CONSTRAINT username_format CHECK (username ~ '^[A-Za-z0-9_]{3,20}$') NOT VALID;

ALTER TABLE party_slots DROP CONSTRAINT IF EXISTS slot_rules;
ALTER TABLE party_slots ADD CONSTRAINT slot_rules CHECK (
  (slot_type = 'Champion'   AND slot_position BETWEEN 1 AND 2) OR
  (slot_type = 'Specialist' AND slot_position BETWEEN 1 AND 3) OR
  (slot_type = 'Support'    AND slot_position BETWEEN 1 AND 2) OR
  (slot_type = 'Medic'      AND slot_position = 1) OR
  (slot_type = 'Sub'        AND slot_position BETWEEN 1 AND 2)
) NOT VALID;
