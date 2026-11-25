-- Countries, guilds, guild parties, nakama and one-on-one fights. Run once after 004_avatar.sql. Safe to run again.
-- Naming: the tables "parties" and "party_slots" hold a player's LINEUP of characters (the game's old name for it).
-- A party in the game is now a group of guild mates: guild_parties.
-- The numbers here (sizes, type advantage, luck) mirror webapp/lib/game.js and webapp/lib/demo.js.

-- 1. Countries. Nigeria first; open more by inserting them with is_open = TRUE.
CREATE TABLE IF NOT EXISTS countries (
    code        CHAR(2) PRIMARY KEY,
    name        TEXT NOT NULL,
    region      TEXT NOT NULL,
    is_open     BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO countries (code, name, region, is_open) VALUES ('NG', 'Nigeria', 'Africa', TRUE)
ON CONFLICT (code) DO NOTHING;

-- players can't change this themselves: 004 only lets them update their picture
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code CHAR(2) NOT NULL DEFAULT 'NG' REFERENCES countries(code);

-- 2. Guilds: one per player, in the player's own country.
CREATE TABLE IF NOT EXISTS guilds (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL CHECK (name ~ '^[A-Za-z0-9][A-Za-z0-9 _-]{1,22}[A-Za-z0-9]$'),
    tag             TEXT NOT NULL UNIQUE CHECK (tag ~ '^[A-Z0-9]{2,4}$'),
    country_code    CHAR(2) NOT NULL REFERENCES countries(code),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS guilds_name_key ON guilds (lower(name));

CREATE TABLE IF NOT EXISTS guild_members (
    user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    guild_id    INT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS guild_members_guild_idx ON guild_members (guild_id);

-- 3. Parties: guild mates grouped for a battle night or a tournament; one of each per player.
CREATE TABLE IF NOT EXISTS guild_parties (
    id          SERIAL PRIMARY KEY,
    guild_id    INT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 24),
    occasion    TEXT NOT NULL CHECK (occasion IN ('battle', 'tournament')),
    captain_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guild_party_members (
    party_id    INT NOT NULL REFERENCES guild_parties(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    occasion    TEXT NOT NULL,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (party_id, user_id),
    UNIQUE (user_id, occasion)
);

-- 4. Nakama: a player's own list of people they follow.
CREATE TABLE IF NOT EXISTS nakama (
    user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES users(id) ON DELETE CASCADE,
    nakama_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, nakama_id),
    CHECK (user_id <> nakama_id)
);

-- 5. Ranked fights (spars are never stored). Only the challenger's record changes, once per opponent per week.
CREATE TABLE IF NOT EXISTS duels (
    id                  SERIAL PRIMARY KEY,
    challenger_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opponent_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenger_score    INT NOT NULL,
    opponent_score      INT NOT NULL,
    winner_id           UUID,                       -- null = draw
    rounds              JSONB NOT NULL,
    week                DATE NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (challenger_id, opponent_id, week)
);

-- Row security. Guild data is readable by signed-in players; it changes only through the functions below.
ALTER TABLE countries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE guilds              ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_parties       ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE nakama              ENABLE ROW LEVEL SECURITY;
ALTER TABLE duels               ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read" ON countries;
CREATE POLICY "public read" ON countries FOR SELECT USING (true);
DROP POLICY IF EXISTS "players read" ON guilds;
CREATE POLICY "players read" ON guilds FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "players read" ON guild_members;
CREATE POLICY "players read" ON guild_members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "players read" ON guild_parties;
CREATE POLICY "players read" ON guild_parties FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "players read" ON guild_party_members;
CREATE POLICY "players read" ON guild_party_members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "own nakama" ON nakama;
CREATE POLICY "own nakama" ON nakama FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "own duels" ON duels;
CREATE POLICY "own duels" ON duels FOR SELECT TO authenticated USING (auth.uid() IN (challenger_id, opponent_id));

-- Housekeeping when someone leaves (or deletes their account).
CREATE OR REPLACE FUNCTION public.after_guild_leave() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  DELETE FROM public.guild_party_members pm USING public.guild_parties p
   WHERE pm.party_id = p.id AND p.guild_id = OLD.guild_id AND pm.user_id = OLD.user_id;
  IF NOT EXISTS (SELECT 1 FROM public.guild_members WHERE guild_id = OLD.guild_id) THEN
    DELETE FROM public.guilds WHERE id = OLD.guild_id;
  ELSIF OLD.role = 'leader' THEN
    UPDATE public.guild_members SET role = 'leader' WHERE user_id =
      (SELECT user_id FROM public.guild_members WHERE guild_id = OLD.guild_id ORDER BY joined_at, user_id LIMIT 1);
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS guild_leave ON guild_members;
CREATE TRIGGER guild_leave AFTER DELETE ON guild_members FOR EACH ROW EXECUTE FUNCTION public.after_guild_leave();

CREATE OR REPLACE FUNCTION public.after_party_leave() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.guild_party_members WHERE party_id = OLD.party_id) THEN
    DELETE FROM public.guild_parties WHERE id = OLD.party_id;
  ELSE
    UPDATE public.guild_parties SET captain_id =
      (SELECT user_id FROM public.guild_party_members WHERE party_id = OLD.party_id ORDER BY joined_at, user_id LIMIT 1)
     WHERE id = OLD.party_id AND (captain_id = OLD.user_id OR captain_id IS NULL);
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS party_leave ON guild_party_members;
CREATE TRIGGER party_leave AFTER DELETE ON guild_party_members FOR EACH ROW EXECUTE FUNCTION public.after_party_leave();

-- The only ways to change guilds and parties. Each one acts as the signed-in player and no one else.
CREATE OR REPLACE FUNCTION public.create_guild(p_name TEXT, p_tag TEXT) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me UUID := auth.uid(); new_id INT;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = me) THEN RAISE EXCEPTION 'Leave your guild first'; END IF;
  INSERT INTO public.guilds (name, tag, country_code)
    SELECT btrim(p_name), upper(btrim(p_tag)), country_code FROM public.users WHERE id = me
    RETURNING id INTO new_id;
  INSERT INTO public.guild_members (user_id, guild_id, role) VALUES (me, new_id, 'leader');
  RETURN new_id;
EXCEPTION
  WHEN unique_violation THEN RAISE EXCEPTION 'That name or tag is taken';
  WHEN check_violation THEN RAISE EXCEPTION 'Name: 3 to 24 letters or numbers. Tag: 2 to 4.';
END $$;

CREATE OR REPLACE FUNCTION public.join_guild(p_guild INT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me UUID := auth.uid(); home CHAR(2);
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  -- locking the guild row stops two players taking the last seat
  SELECT country_code INTO home FROM public.guilds WHERE id = p_guild FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'That guild no longer exists'; END IF;
  IF home <> (SELECT country_code FROM public.users WHERE id = me) THEN RAISE EXCEPTION 'That guild is in another country'; END IF;
  IF (SELECT count(*) FROM public.guild_members WHERE guild_id = p_guild) >= 30 THEN RAISE EXCEPTION 'That guild is full'; END IF;
  INSERT INTO public.guild_members (user_id, guild_id) VALUES (me, p_guild);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Leave your guild first';
END $$;

CREATE OR REPLACE FUNCTION public.leave_guild() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.guilds g JOIN public.guild_members m ON m.guild_id = g.id WHERE m.user_id = auth.uid() FOR UPDATE OF g;
  DELETE FROM public.guild_members WHERE user_id = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.create_party(p_name TEXT, p_occasion TEXT) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me UUID := auth.uid(); mine INT; new_id INT;
BEGIN
  SELECT guild_id INTO mine FROM public.guild_members WHERE user_id = me;
  IF NOT FOUND THEN RAISE EXCEPTION 'Join a guild first'; END IF;
  INSERT INTO public.guild_parties (guild_id, name, occasion, captain_id) VALUES (mine, btrim(p_name), p_occasion, me)
    RETURNING id INTO new_id;
  INSERT INTO public.guild_party_members (party_id, user_id, occasion) VALUES (new_id, me, p_occasion);
  RETURN new_id;
EXCEPTION
  WHEN unique_violation THEN RAISE EXCEPTION 'You are already in a % party', p_occasion;
  WHEN check_violation THEN RAISE EXCEPTION 'Party name: 3 to 24 characters';
END $$;

CREATE OR REPLACE FUNCTION public.join_party(p_party INT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE me UUID := auth.uid(); target public.guild_parties%ROWTYPE;
BEGIN
  SELECT * INTO target FROM public.guild_parties WHERE id = p_party FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'That party no longer exists'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.guild_members WHERE user_id = me AND guild_id = target.guild_id) THEN
    RAISE EXCEPTION 'That party belongs to another guild';
  END IF;
  IF (SELECT count(*) FROM public.guild_party_members WHERE party_id = p_party) >= 5 THEN RAISE EXCEPTION 'That party is full'; END IF;
  INSERT INTO public.guild_party_members (party_id, user_id, occasion) VALUES (p_party, me, target.occasion);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'You are already in a % party', target.occasion;
END $$;

CREATE OR REPLACE FUNCTION public.leave_party(p_party INT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.guild_parties WHERE id = p_party FOR UPDATE;
  DELETE FROM public.guild_party_members WHERE party_id = p_party AND user_id = auth.uid();
END $$;

-- One on one: lineup against lineup, slot by slot, using the battle night fight rules.
-- A slot is worth its battle night points; an empty slot loses to a filled one.
CREATE OR REPLACE FUNCTION public.duel(p_opponent UUID, p_ranked BOOLEAN) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  me UUID := auth.uid();
  type_order TEXT[] := ARRAY['Physical', 'Tactical', 'Cursed', 'Spiritual', 'Elemental', 'Mythic'];
  r RECORD;
  pa FLOAT8; pb FLOAT8;
  worth INT; side TEXT;
  mine INT := 0; theirs INT := 0;
  rounds JSONB := '[]'::JSONB;
  winner UUID;
  who UUID;
  filled INT; cost BIGINT;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF p_opponent = me THEN RAISE EXCEPTION 'You can''t fight yourself'; END IF;
  IF p_ranked IS NULL OR NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_opponent) THEN RAISE EXCEPTION 'No such player'; END IF;

  FOREACH who IN ARRAY ARRAY[me, p_opponent] LOOP
    SELECT count(*), COALESCE(sum(c.gold_cost), 0) INTO filled, cost
      FROM public.parties p
      JOIN public.party_slots s ON s.party_id = p.id
      JOIN public.characters c ON c.character_id = s.character_id
     WHERE p.user_id = who;
    IF filled = 0 THEN RAISE EXCEPTION '%', CASE WHEN who = me THEN 'Build your lineup first' ELSE 'They have no lineup yet' END; END IF;
    IF cost > 100000000 THEN RAISE EXCEPTION '%', CASE WHEN who = me THEN 'Your lineup is over budget' ELSE 'Their lineup is over budget' END; END IF;
  END LOOP;

  FOR r IN
    WITH a AS (
      SELECT s.slot_type, s.slot_position, c.character_id, c.overall, c.power_type
        FROM public.parties p JOIN public.party_slots s ON s.party_id = p.id
        JOIN public.characters c ON c.character_id = s.character_id WHERE p.user_id = me
    ), b AS (
      SELECT s.slot_type, s.slot_position, c.character_id, c.overall, c.power_type
        FROM public.parties p JOIN public.party_slots s ON s.party_id = p.id
        JOIN public.characters c ON c.character_id = s.character_id WHERE p.user_id = p_opponent
    )
    SELECT slot_type, slot_position,
           a.character_id AS a_id, a.overall AS a_overall, a.power_type AS a_type,
           b.character_id AS b_id, b.overall AS b_overall, b.power_type AS b_type
      FROM a FULL JOIN b USING (slot_type, slot_position)
     ORDER BY array_position(ARRAY['Champion', 'Specialist', 'Support', 'Medic', 'Sub'], slot_type), slot_position
  LOOP
    worth := CASE r.slot_type WHEN 'Champion' THEN 5 WHEN 'Specialist' THEN 4 WHEN 'Support' THEN 3 WHEN 'Medic' THEN 3 ELSE 1 END;
    IF r.b_id IS NULL THEN side := 'a';
    ELSIF r.a_id IS NULL THEN side := 'b';
    ELSE
      -- overall, +6 for a type edge, plus a normally distributed swing of spread 8
      pa := COALESCE(r.a_overall, 50) + CASE WHEN type_order[array_position(type_order, r.a_type) % 6 + 1] = r.b_type THEN 6 ELSE 0 END
            + sqrt(-2 * ln(1 - random())) * cos(2 * pi() * random()) * 8;
      pb := COALESCE(r.b_overall, 50) + CASE WHEN type_order[array_position(type_order, r.b_type) % 6 + 1] = r.a_type THEN 6 ELSE 0 END
            + sqrt(-2 * ln(1 - random())) * cos(2 * pi() * random()) * 8;
      side := CASE WHEN abs(pa - pb) < 1.5 THEN 'draw' WHEN pa > pb THEN 'a' ELSE 'b' END;
    END IF;
    mine   := mine   + CASE side WHEN 'a' THEN worth WHEN 'draw' THEN 1 ELSE 0 END;
    theirs := theirs + CASE side WHEN 'b' THEN worth WHEN 'draw' THEN 1 ELSE 0 END;
    rounds := rounds || jsonb_build_object('slot', r.slot_type, 'position', r.slot_position, 'a', r.a_id, 'b', r.b_id, 'winner', side);
  END LOOP;

  winner := CASE WHEN mine > theirs THEN me WHEN theirs > mine THEN p_opponent END;
  IF p_ranked THEN
    BEGIN
      INSERT INTO public.duels (challenger_id, opponent_id, challenger_score, opponent_score, winner_id, rounds, week)
      VALUES (me, p_opponent, mine, theirs, winner, rounds, date_trunc('week', now() AT TIME ZONE 'UTC')::DATE);
    EXCEPTION WHEN unique_violation THEN
      -- raising here also throws away the result, so a ranked fight can't be re-rolled
      RAISE EXCEPTION 'You already fought them this week. Spar instead.';
    END;
  END IF;
  RETURN jsonb_build_object('ranked', p_ranked, 'challenger_score', mine, 'opponent_score', theirs, 'winner_id', winner, 'rounds', rounds);
END $$;

REVOKE EXECUTE ON FUNCTION
  public.create_guild(TEXT, TEXT), public.join_guild(INT), public.leave_guild(), public.create_party(TEXT, TEXT),
  public.join_party(INT), public.leave_party(INT), public.duel(UUID, BOOLEAN), public.after_guild_leave(), public.after_party_leave()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.create_guild(TEXT, TEXT), public.join_guild(INT), public.leave_guild(), public.create_party(TEXT, TEXT),
  public.join_party(INT), public.leave_party(INT), public.duel(UUID, BOOLEAN)
  TO authenticated;

-- Leaderboards: names and scores only. New columns can only be appended to an existing view.
CREATE OR REPLACE VIEW leaderboard AS
SELECT u.username, r.current_rank, r.season_points, r.all_time_points, r.is_legend, u.avatar_character_id,
       u.id AS user_id, u.country_code,
       g.id AS guild_id, g.name AS guild_name, g.tag AS guild_tag, m.role AS guild_role,
       COALESCE(d.wins, 0)::INT AS duel_wins, COALESCE(d.losses, 0)::INT AS duel_losses, COALESCE(d.draws, 0)::INT AS duel_draws,
       COALESCE(w.points, 0) AS week_points
FROM user_ranks r
JOIN users u ON u.id = r.user_id
LEFT JOIN guild_members m ON m.user_id = u.id
LEFT JOIN guilds g ON g.id = m.guild_id
LEFT JOIN (
    SELECT challenger_id,
           count(*) FILTER (WHERE winner_id = challenger_id) AS wins,
           count(*) FILTER (WHERE winner_id = opponent_id)   AS losses,
           count(*) FILTER (WHERE winner_id IS NULL)         AS draws
    FROM duels GROUP BY challenger_id
) d ON d.challenger_id = u.id
LEFT JOIN (
    SELECT user_id, sum(final_points) AS points FROM fantasy_points
    WHERE gameweek_id = (SELECT max(gameweek_id) FROM gameweeks WHERE is_completed)
    GROUP BY user_id
) w ON w.user_id = u.id;

-- a guild scores the season points of its members
CREATE OR REPLACE VIEW guild_leaderboard AS
SELECT g.id AS guild_id, g.name, g.tag, g.country_code,
       count(m.user_id)::INT AS members, COALESCE(sum(r.season_points), 0) AS season_points
FROM guilds g
LEFT JOIN guild_members m ON m.guild_id = g.id
LEFT JOIN user_ranks r ON r.user_id = m.user_id
GROUP BY g.id;

-- signed-in players only: the views now carry player ids and guild membership
REVOKE ALL ON leaderboard, guild_leaderboard FROM anon, authenticated;
GRANT SELECT ON leaderboard, guild_leaderboard TO authenticated;
