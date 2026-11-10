-- Full schema for a fresh Supabase project, matching what the web app and pipeline use.
-- Fresh project: run this file, then 002_leaderboard.sql. Existing database: run only 002_leaderboard.sql.

CREATE TABLE characters (
    character_id        INT PRIMARY KEY,           -- AniList id
    name                TEXT NOT NULL,
    image_url           TEXT,
    anime_title         TEXT,
    role                TEXT,
    favourites          INT,
    power_type          TEXT,
    strength            SMALLINT,
    speed               SMALLINT,
    defence             SMALLINT,
    technique           SMALLINT,
    magic               SMALLINT,
    iq                  SMALLINT,
    aura                SMALLINT,
    overall             SMALLINT,
    gold_cost           INT,
    trait_1             TEXT,
    trait_2             TEXT,
    awakening_name      TEXT,
    awakening_trigger   TEXT,
    awakening_boost     SMALLINT,
    is_active           BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP DEFAULT now()
);

-- login is Supabase auth (username@gyokan.gg); this table holds the public profile
CREATE TABLE users (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username            TEXT UNIQUE NOT NULL,
    created_at          TIMESTAMP DEFAULT now()
);

CREATE TABLE parties (
    id                  SERIAL PRIMARY KEY,
    user_id             UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at          TIMESTAMP DEFAULT now(),
    updated_at          TIMESTAMP DEFAULT now()
);

CREATE TABLE party_slots (
    id                  SERIAL PRIMARY KEY,
    party_id            INT REFERENCES parties(id) ON DELETE CASCADE,
    character_id        INT REFERENCES characters(character_id),
    slot_type           TEXT NOT NULL,             -- Champion | Specialist | Support | Medic | Sub
    slot_position       SMALLINT NOT NULL,
    gameweek            INT,
    UNIQUE (party_id, character_id),
    UNIQUE (party_id, slot_type, slot_position)
);

CREATE TABLE seasons (
    season_id           SERIAL PRIMARY KEY,
    name                TEXT,
    start_date          DATE,
    end_date            DATE,
    is_active           BOOLEAN DEFAULT FALSE
);

CREATE TABLE gameweeks (
    gameweek_id         SERIAL PRIMARY KEY,
    season_id           INT REFERENCES seasons(season_id),
    gameweek_number     INT NOT NULL,
    battle_date         DATE NOT NULL,
    is_completed        BOOLEAN DEFAULT FALSE
);

CREATE TABLE fixtures (
    fixture_id          SERIAL PRIMARY KEY,
    gameweek_id         INT REFERENCES gameweeks(gameweek_id),
    character_a_id      INT REFERENCES characters(character_id),
    character_b_id      INT REFERENCES characters(character_id),
    CHECK (character_a_id <> character_b_id)
);

CREATE TABLE results (
    result_id           SERIAL PRIMARY KEY,
    fixture_id          INT UNIQUE REFERENCES fixtures(fixture_id),
    winner_id           INT REFERENCES characters(character_id),
    loser_id            INT REFERENCES characters(character_id),
    was_draw            BOOLEAN DEFAULT FALSE,
    simulated_at        TIMESTAMP DEFAULT now()
);

CREATE TABLE fantasy_points (
    points_id               SERIAL PRIMARY KEY,
    user_id                 UUID REFERENCES users(id) ON DELETE CASCADE,
    gameweek_id             INT REFERENCES gameweeks(gameweek_id),
    character_id            INT REFERENCES characters(character_id),
    slot_type               TEXT,
    base_points             NUMERIC,
    medic_boost_applied     BOOLEAN DEFAULT FALSE,
    final_points            NUMERIC,
    UNIQUE (user_id, gameweek_id, character_id)
);

CREATE TABLE user_ranks (
    rank_id             SERIAL PRIMARY KEY,
    user_id             UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_rank        TEXT DEFAULT 'Rookie',
    season_points       NUMERIC DEFAULT 0,
    all_time_points     NUMERIC DEFAULT 0,
    is_legend           BOOLEAN DEFAULT FALSE,
    updated_at          TIMESTAMP DEFAULT now()
);

-- Row security: the browser uses the anon key, so every table needs it.
-- The battle job connects with DATABASE_URL as the owner and bypasses these.
ALTER TABLE characters      ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE gameweeks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixtures        ENABLE ROW LEVEL SECURITY;
ALTER TABLE results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties         ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_slots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_points  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ranks      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON characters FOR SELECT USING (true);
CREATE POLICY "public read" ON seasons    FOR SELECT USING (true);
CREATE POLICY "public read" ON gameweeks  FOR SELECT USING (true);
CREATE POLICY "public read" ON fixtures   FOR SELECT USING (true);
CREATE POLICY "public read" ON results    FOR SELECT USING (true);
CREATE POLICY "public read" ON users      FOR SELECT USING (true);  -- usernames only, for "username taken"

CREATE POLICY "own profile"  ON users          FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "own rank"     ON user_ranks     FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own rank add" ON user_ranks     FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "own points"   ON fantasy_points FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own party"    ON parties        FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own slots"    ON party_slots    FOR ALL
    USING (party_id IN (SELECT id FROM parties WHERE user_id = auth.uid()))
    WITH CHECK (party_id IN (SELECT id FROM parties WHERE user_id = auth.uid()));
