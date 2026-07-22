CREATE TABLE characters (
    character_id        INT PRIMARY KEY,
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

CREATE TABLE users (
    user_id             SERIAL PRIMARY KEY,
    username            TEXT UNIQUE NOT NULL,
    email               TEXT UNIQUE NOT NULL,
    password_hash       TEXT NOT NULL,
    created_at          TIMESTAMP DEFAULT now()
);

CREATE TABLE parties (
    party_id            SERIAL PRIMARY KEY,
    user_id             INT REFERENCES users(user_id) UNIQUE,
    created_at          TIMESTAMP DEFAULT now(),
    updated_at          TIMESTAMP DEFAULT now()
);

CREATE TABLE party_slots (
    slot_id             SERIAL PRIMARY KEY,
    party_id            INT REFERENCES parties(party_id),
    character_id        INT REFERENCES characters(character_id),
    slot_type           TEXT NOT NULL,
    slot_position       SMALLINT NOT NULL,
    gameweek            INT,
    UNIQUE (party_id, slot_type, slot_position, gameweek)
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
    user_id                 INT REFERENCES users(user_id),
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
    user_id             INT REFERENCES users(user_id) UNIQUE,
    current_rank        TEXT DEFAULT 'Rookie',
    season_points       NUMERIC DEFAULT 0,
    all_time_points     NUMERIC DEFAULT 0,
    is_legend           BOOLEAN DEFAULT FALSE,
    updated_at          TIMESTAMP DEFAULT now()
);