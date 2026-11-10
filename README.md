# Gyokan Legends

Fantasy battles with 2,000 anime characters. Sign 10 characters with 100M gold, and every Thursday
they fight. Wins score points by slot, points climb you from Rookie to Legendary.

## Parts

- `webapp/` – Next.js app (Supabase auth + data). `npm run dev` inside it.
- `pipeline/` – Python: `extract.py` pulls characters from AniList, `transform.py` gives them stats,
  power types and gold costs, `load.py` writes them to the database, `battle.py` runs a battle night.
- `sql/` – `schema.sql` for a fresh database, `002_leaderboard.sql` to add the leaderboard to an existing one.
- `.github/workflows/battles.yml` – runs `battle.py` every Thursday 19:00 UTC (or on demand from the Actions tab).

Game numbers live in `pipeline/battle.py` and `webapp/lib/game.js`; change both together.

## Setup

1. Supabase: restore the project (or make a new one and run `sql/schema.sql`), then run `sql/002_leaderboard.sql`.
2. `pipeline/.env` and `webapp/.env.local` hold `DATABASE_URL` and the `NEXT_PUBLIC_SUPABASE_*` keys.
3. Load characters with stats: `cd pipeline && pip install -r requirements.txt && python transform.py && python load.py`
4. In GitHub → Settings → Secrets → Actions, add `DATABASE_URL` so the Thursday job can run.
5. Tests for the battle rules: `python pipeline/test_battle.py`
