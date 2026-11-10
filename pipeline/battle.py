"""Weekly battle night: pair every active character, simulate the fights, score every party.

Run once per gameweek (GitHub Actions does it every Thursday): python pipeline/battle.py
Safe to re-run the same day: it stops if today's gameweek already exists.
Keep the numbers here in sync with webapp/lib/game.js (the rules page reads those).
"""
import os
import random
from datetime import date

SLOT_POINTS = {"Champion": 5, "Specialist": 4, "Support": 3, "Medic": 3, "Sub": 1}
DRAW_POINTS = 1
MEDIC_BOOST = 1.5          # a winning Medic multiplies every other winner in the party
TYPE_ADVANTAGE = 6         # bonus power when your type beats theirs
DRAW_MARGIN = 1.5          # fights closer than this are draws
LUCK = 8                   # spread of the random swing in each fight

# each type beats the next one in the circle
TYPE_CYCLE = ["Physical", "Tactical", "Cursed", "Spiritual", "Elemental", "Mythic"]
BEATS = {t: TYPE_CYCLE[(i + 1) % len(TYPE_CYCLE)] for i, t in enumerate(TYPE_CYCLE)}

# season points needed for each rank, highest first
RANKS = [(500, "Legendary"), (350, "Sovereign"), (220, "Warlord"), (110, "Veteran"), (40, "Ronin"), (0, "Rookie")]


BUDGET = 100_000_000
SLOT_LIMITS = {"Champion": 2, "Specialist": 3, "Support": 2, "Medic": 1, "Sub": 2}


def rank_for(points):
    return next(name for floor, name in RANKS if points >= floor)


def party_is_legal(slots, costs):
    """The browser enforces these too, but a tampered client could skip it. slots: [(character_id, slot_type)]."""
    types = [t for _, t in slots]
    within_slots = all(types.count(t) <= SLOT_LIMITS.get(t, 0) for t in set(types))
    within_budget = sum(costs.get(c) or 0 for c, _ in slots) <= BUDGET
    return within_slots and within_budget and len({c for c, _ in slots}) == len(slots)


def pair_up(character_ids, rng):
    ids = list(character_ids)
    rng.shuffle(ids)
    return [(ids[i], ids[i + 1]) for i in range(0, len(ids) - 1, 2)]  # odd one out sits this week


def fight(a, b, rng):
    """a and b are dicts with character_id, overall, power_type. Returns the winner id, or None for a draw."""
    def power(me, them):
        edge = TYPE_ADVANTAGE if BEATS.get(me["power_type"]) == them["power_type"] else 0
        return (me["overall"] or 50) + edge + rng.gauss(0, LUCK)

    pa, pb = power(a, b), power(b, a)
    if abs(pa - pb) < DRAW_MARGIN:
        return None
    return a["character_id"] if pa > pb else b["character_id"]


def score_party(slots, outcomes):
    """slots: [(character_id, slot_type)]. outcomes: {character_id: 'win'|'draw'|'loss'} (missing = sat out).
    Returns [(character_id, slot_type, base_points, medic_boost_applied, final_points)]."""
    medic_won = any(t == "Medic" and outcomes.get(c) == "win" for c, t in slots)
    rows = []
    for character_id, slot_type in slots:
        outcome = outcomes.get(character_id)
        base = SLOT_POINTS.get(slot_type, 0) if outcome == "win" else DRAW_POINTS if outcome == "draw" else 0
        boosted = medic_won and outcome == "win" and slot_type != "Medic"
        final = round(base * MEDIC_BOOST, 1) if boosted else base
        rows.append((character_id, slot_type, base, boosted, final))
    return rows


def run():
    import psycopg2
    from psycopg2.extras import execute_values
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    today = date.today()
    rng = random.Random()
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    cur.execute("SELECT season_id FROM seasons WHERE is_active ORDER BY season_id DESC LIMIT 1")
    row = cur.fetchone()
    if row:
        season_id = row[0]
    else:
        cur.execute("INSERT INTO seasons (name, start_date, is_active) VALUES ('Season 1', %s, TRUE) RETURNING season_id", (today,))
        season_id = cur.fetchone()[0]

    cur.execute("SELECT 1 FROM gameweeks WHERE season_id = %s AND battle_date = %s", (season_id, today))
    if cur.fetchone():
        print(f"Gameweek for {today} already exists, nothing to do")
        return

    cur.execute("SELECT COALESCE(MAX(gameweek_number), 0) + 1 FROM gameweeks WHERE season_id = %s", (season_id,))
    gw_number = cur.fetchone()[0]
    cur.execute(
        "INSERT INTO gameweeks (season_id, gameweek_number, battle_date) VALUES (%s, %s, %s) RETURNING gameweek_id",
        (season_id, gw_number, today),
    )
    gameweek_id = cur.fetchone()[0]

    cur.execute("SELECT character_id, overall, power_type, gold_cost, is_active FROM characters")
    all_chars = cur.fetchall()
    costs = {r[0]: r[3] for r in all_chars}
    fighters = {r[0]: {"character_id": r[0], "overall": r[1], "power_type": r[2]} for r in all_chars if r[4]}
    pairs = pair_up(fighters, rng)

    fixture_ids = execute_values(
        cur,
        "INSERT INTO fixtures (gameweek_id, character_a_id, character_b_id) VALUES %s RETURNING fixture_id",
        [(gameweek_id, a, b) for a, b in pairs],
        fetch=True,
    )

    outcomes, results = {}, []
    for (fixture_id,), (a, b) in zip(fixture_ids, pairs):
        winner = fight(fighters[a], fighters[b], rng)
        if winner is None:
            outcomes[a] = outcomes[b] = "draw"
            results.append((fixture_id, None, None, True))
        else:
            loser = b if winner == a else a
            outcomes[winner], outcomes[loser] = "win", "loss"
            results.append((fixture_id, winner, loser, False))
    execute_values(cur, "INSERT INTO results (fixture_id, winner_id, loser_id, was_draw) VALUES %s", results)

    cur.execute("SELECT p.user_id, s.character_id, s.slot_type FROM party_slots s JOIN parties p ON p.id = s.party_id")
    parties = {}
    for user_id, character_id, slot_type in cur.fetchall():
        parties.setdefault(user_id, []).append((character_id, slot_type))

    point_rows, week_totals = [], {}
    for user_id, slots in parties.items():
        if not party_is_legal(slots, costs):
            print(f"Skipping party of {user_id}: over budget or too many in a slot")
            continue
        rows = score_party(slots, outcomes)
        point_rows += [(user_id, gameweek_id, *r) for r in rows]
        week_totals[user_id] = sum(r[4] for r in rows)
    if point_rows:
        execute_values(
            cur,
            """INSERT INTO fantasy_points
               (user_id, gameweek_id, character_id, slot_type, base_points, medic_boost_applied, final_points)
               VALUES %s""",
            point_rows,
        )

    for user_id, week in week_totals.items():
        cur.execute(
            """INSERT INTO user_ranks (user_id, season_points, all_time_points) VALUES (%s, %s, %s)
               ON CONFLICT (user_id) DO UPDATE SET
                 season_points = user_ranks.season_points + EXCLUDED.season_points,
                 all_time_points = user_ranks.all_time_points + EXCLUDED.all_time_points,
                 updated_at = now()
               RETURNING season_points""",
            (user_id, week, week),
        )
        season_points = cur.fetchone()[0]
        rank = rank_for(season_points)
        cur.execute(
            "UPDATE user_ranks SET current_rank = %s, is_legend = is_legend OR %s WHERE user_id = %s",
            (rank, rank == "Legendary", user_id),
        )

    cur.execute("UPDATE gameweeks SET is_completed = TRUE WHERE gameweek_id = %s", (gameweek_id,))
    conn.commit()
    conn.close()
    print(f"Gameweek {gw_number}: {len(pairs)} battles, {len(week_totals)} of {len(parties)} parties scored")


if __name__ == "__main__":
    run()
