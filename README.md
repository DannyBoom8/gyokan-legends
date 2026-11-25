# Gyokan Legends

Fantasy battles with 2,000 anime characters. Build a lineup of 10 with 100M gold, and every Thursday
they fight. Wins score points by slot, points climb you from Rookie to Legendary.

## Parts

- `webapp/` – Next.js app (Supabase auth + data). `npm run dev` inside it. Live at https://legends.utilox.com:
  a static export served by the Cloudflare Worker `gyokan-legends`; `npm run deploy` builds and ships it.
- `pipeline/` – Python: `extract.py` pulls characters from AniList, `transform.py` gives them stats,
  power types and gold costs, `load.py` writes them to the database, `battle.py` runs a battle night.
- `sql/` – `schema.sql` for a fresh database, then `002` to `005` in order (005: countries, guilds, parties, nakama, battle records).
- `.github/workflows/battles.yml` – runs `battle.py` every Thursday 19:00 UTC (or on demand from the Actions tab).

Game numbers live in `pipeline/battle.py` and `webapp/lib/game.js`; change both together.
The fantasy league (lineup, battle night, ranks, points, scouting, rules) is the app's Fantasy section: its pages share
the tabs in `webapp/components/FantasyTabs.js`.
Guild and party rules live in `sql/005_guilds.sql`, with demo mode's copy in `webapp/lib/guild-rules.js`.
The tables `parties` and `party_slots` hold a player's lineup; guild parties are `guild_parties`.

Every fight between players is under Battle (`webapp/app/battle`): one on one, guild war and the cup. The Squad page only
sets the team up.

Squad (demo only so far): six cards, one per power type, each ranked E to S. A new player's favourite character joins at
once and they pick the other five from random choices. Engine and balance numbers are in `webapp/lib/squad.js`, player
actions in `webapp/lib/squad-rules.js`, which also holds guild wars (battle party against battle party) and the weekly cup
(a knockout between tournament parties with a rank limit). Cup winners wear a champion badge.

Cards: a player can own any number. Under Squad are four tabs: Squad, My Cards (upgrade, traits, swap, lock, use up a
spare), Market (six a day) and Rewards (daily and weekly). Season points are also coins, so lineup scores and ranked wins
pay for the market. It has no database tables yet, and the server must decide every fight, reward and purchase once it does.

## Setup

1. Supabase: restore the project (or make a new one and run `sql/schema.sql`), then run `sql/002_leaderboard.sql` to `sql/005_guilds.sql`.
2. `pipeline/.env` and `webapp/.env.local` hold `DATABASE_URL` and the `NEXT_PUBLIC_SUPABASE_*` keys.
3. Load characters with stats: `cd pipeline && pip install -r requirements.txt && python transform.py && python load.py`
4. In GitHub → Settings → Secrets → Actions, add `DATABASE_URL` so the Thursday job can run.
5. Tests: `python pipeline/test_battle.py`, `node webapp/lib/guild-rules.test.mjs` and `node webapp/lib/squad.test.mjs`
