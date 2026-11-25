-- Profile pictures: a player picks one of the characters. Run once after 003_harden.sql. Safe to run again.

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_character_id INT REFERENCES characters(character_id);

-- a player may change their own picture and nothing else (the column grant stops username edits)
DROP POLICY IF EXISTS "own avatar" ON users;
CREATE POLICY "own avatar" ON users FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
REVOKE UPDATE ON users FROM anon, authenticated;
GRANT UPDATE (avatar_character_id) ON users TO authenticated;

-- new columns can only be appended to an existing view
CREATE OR REPLACE VIEW leaderboard AS
SELECT u.username, r.current_rank, r.season_points, r.all_time_points, r.is_legend, u.avatar_character_id
FROM user_ranks r
JOIN users u ON u.id = r.user_id;
