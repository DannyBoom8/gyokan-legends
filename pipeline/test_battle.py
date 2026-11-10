"""Checks the battle rules without a database: python pipeline/test_battle.py"""
import random
from battle import BEATS, fight, pair_up, party_is_legal, rank_for, score_party

rng = random.Random(1)

# pairing: everyone fights once, odd one sits out
pairs = pair_up(range(7), rng)
flat = [c for p in pairs for c in p]
assert len(pairs) == 3 and len(set(flat)) == 6

# type circle: every type beats exactly one other and is beaten by exactly one
assert sorted(BEATS) == sorted(BEATS.values())

# stronger characters win most fights, but not all
strong = {"character_id": 1, "overall": 90, "power_type": "Mythic"}
weak = {"character_id": 2, "overall": 60, "power_type": "Cursed"}
wins = sum(fight(strong, weak, rng) == 1 for _ in range(1000))
assert 950 < wins < 1000, wins

# type advantage matters in an even fight
a = {"character_id": 1, "overall": 70, "power_type": "Physical"}
b = {"character_id": 2, "overall": 70, "power_type": "Tactical"}  # Physical beats Tactical
assert sum(fight(a, b, rng) == 1 for _ in range(2000)) > 1200

# scoring: Champion win 5, draw 1, loss 0; winning Medic boosts other winners x1.5
slots = [(1, "Champion"), (2, "Specialist"), (3, "Sub"), (4, "Medic")]
rows = {r[0]: r for r in score_party(slots, {1: "win", 2: "draw", 3: "loss"})}
assert rows[1][4] == 5 and rows[2][4] == 1 and rows[3][4] == 0 and rows[4][4] == 0
rows = {r[0]: r for r in score_party(slots, {1: "win", 2: "win", 4: "win"})}
assert rows[1][4] == 7.5 and rows[1][3] and rows[2][4] == 6.0 and rows[4][4] == 3 and not rows[4][3]

# ranks
assert rank_for(0) == "Rookie" and rank_for(40) == "Ronin" and rank_for(499) == "Sovereign" and rank_for(999) == "Legendary"

# party rules: budget, slot limits, no duplicates
costs = {1: 15_000_000, 2: 15_000_000, 3: 15_000_000, 4: 5_000_000}
assert party_is_legal([(1, "Champion"), (2, "Champion"), (4, "Medic")], costs)
assert not party_is_legal([(1, "Champion"), (2, "Champion"), (3, "Champion")], costs)        # 3 champions
assert not party_is_legal([(1, "Champion"), (1, "Specialist")], costs)                        # same character twice
assert not party_is_legal([(i, "Specialist") for i in (1, 2, 3)] + [(5, "Champion"), (6, "Champion"), (7, "Support"), (8, "Support")],
                          {**costs, 5: 15_000_000, 6: 15_000_000, 7: 15_000_000, 8: 15_000_000})  # 105M

print("all battle checks passed")
