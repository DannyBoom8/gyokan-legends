-- Run once on the existing Supabase database (SQL editor). Safe to run again.

-- battle.py upserts ranks per user
CREATE UNIQUE INDEX IF NOT EXISTS user_ranks_user_id_key ON user_ranks (user_id);

-- public leaderboard: only names and points, so it can skip the per-user row security
CREATE OR REPLACE VIEW leaderboard AS
SELECT u.username, r.current_rank, r.season_points, r.all_time_points, r.is_legend
FROM user_ranks r
JOIN users u ON u.id = r.user_id;

GRANT SELECT ON leaderboard TO anon, authenticated;
