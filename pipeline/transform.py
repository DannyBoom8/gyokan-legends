import pandas as pd
import os
import random

def load_raw_data():
    input_path = os.path.join(os.path.dirname(__file__), "data", "characters_raw.csv")
    df = pd.read_csv(input_path)
    print(f"Loaded {len(df)} characters from CSV")
    return df

def clean_data(df):
    # drop rows with no name or no favourites
    df = df.dropna(subset=["name", "favourites"])

    # fill missing anime titles with Unknown
    df["anime_title"] = df["anime_title"].fillna("Unknown")

    # fill missing roles with UNKNOWN
    df["role"] = df["role"].fillna("UNKNOWN")

    # make sure favourites is an integer
    df["favourites"] = df["favourites"].astype(int)

    # strip whitespace from text columns
    df["name"] = df["name"].str.strip()
    df["anime_title"] = df["anime_title"].str.strip()

    print(f"After cleaning: {len(df)} characters remaining")
    return df

POWER_TYPES = ["Physical", "Elemental", "Spiritual", "Tactical", "Cursed", "Mythic"]
STATS = ["strength", "speed", "defence", "technique", "magic", "iq", "aura"]

# each power type leans on some stats; biases sum to 0 so overall stays honest
TYPE_BIAS = {
    "Physical":  {"strength": 10, "speed": 4, "defence": 4, "magic": -10, "aura": -8},
    "Elemental": {"magic": 10, "aura": 4, "technique": 2, "defence": -8, "iq": -8},
    "Spiritual": {"aura": 10, "magic": 4, "iq": 2, "strength": -8, "speed": -8},
    "Tactical":  {"iq": 12, "technique": 6, "speed": 2, "strength": -10, "aura": -10},
    "Cursed":    {"magic": 8, "aura": 8, "technique": 2, "defence": -10, "iq": -8},
    "Mythic":    {"aura": 6, "defence": 6, "strength": 4, "speed": -8, "technique": -8},
}


# Types are assigned by lore, not at random. Order of lookup: a named character, then the series default,
# then (for series we haven't mapped) a seeded random pick. Edit these tables to fix a type.
ANIME_TYPE = {
    "jujutsu": "Cursed", "chainsaw": "Cursed", "tokyo ghoul": "Cursed", "hell": "Cursed", "dorohedoro": "Cursed",
    "death note": "Tactical", "code geass": "Tactical", "steins": "Tactical", "monster": "Tactical",
    "kaguya": "Tactical", "elite": "Tactical", "kakegurui": "Tactical", "spy x family": "Tactical",
    "dr. stone": "Tactical", "cowboy bebop": "Tactical", "banana fish": "Tactical", "oshi no ko": "Tactical",
    "apothecary": "Tactical", "snafu": "Tactical", "sword art": "Tactical", "86": "Tactical",
    "naruto": "Spiritual", "bleach": "Spiritual", "noragami": "Spiritual", "mob psycho": "Spiritual",
    "re:zero": "Spiritual", "madoka": "Spiritual", "jojo": "Spiritual", "bungo": "Spiritual", "fruits basket": "Spiritual",
    "fullmetal": "Elemental", "black clover": "Elemental", "frieren": "Elemental", "mushoku": "Elemental",
    "konosuba": "Elemental", "fairy tail": "Elemental", "dragon ball": "Physical",
    "attack on titan": "Physical", "one piece": "Physical", "my hero": "Physical", "demon slayer": "Physical",
    "one-punch": "Physical", "haikyu": "Physical", "gintama": "Physical", "berserk": "Physical",
    "fate/": "Mythic", "evangelion": "Mythic", "slime": "Mythic", "solo leveling": "Mythic",
    "gurren": "Mythic", "lustrous": "Mythic", "hunter x hunter": "Tactical",
}

# every word in the key must appear in the character's name (any order, so "Luffy Monkey" == "Monkey D. Luffy")
CHARACTER_TYPE = {
    "gojou": "Mythic", "sukuna": "Cursed", "itadori": "Physical", "fushiguro": "Cursed", "levi": "Physical",
    "eren": "Mythic", "mikasa": "Physical", "armin": "Tactical", "erwin": "Tactical",
    "lawliet": "Tactical", "yagami": "Tactical", "lelouch": "Tactical", "killua": "Elemental", "gon": "Physical",
    "hisoka": "Tactical", "kurapika": "Spiritual", "luffy": "Physical", "zoro": "Physical", "sanji": "Physical",
    "nami": "Tactical", "robin": "Tactical", "naruto": "Mythic", "sasuke": "Elemental", "itachi": "Cursed",
    "kakashi": "Elemental", "madara": "Mythic", "goku": "Mythic", "vegeta": "Physical", "saitama": "Physical",
    "genos": "Elemental", "tatsumaki": "Spiritual", "rem": "Elemental", "emilia": "Elemental",
    "subaru": "Tactical", "edward": "Elemental", "alphonse": "Spiritual", "mustang": "Elemental",
    "ichigo": "Spiritual", "rukia": "Elemental", "aizen": "Mythic", "tanjiro": "Elemental",
    "nezuko": "Mythic", "zenitsu": "Elemental", "inosuke": "Physical", "rengoku": "Elemental",
    "deku": "Physical", "midoriya": "Physical", "bakugou": "Elemental", "todoroki": "Elemental",
    "all might": "Physical", "denji": "Cursed", "makima": "Cursed", "power": "Cursed", "kaneki": "Cursed",
    "guts": "Physical", "griffith": "Tactical", "frieren": "Elemental", "fern": "Elemental",
    "jinwoo": "Cursed", "rimuru": "Mythic", "reigen": "Tactical", "mob": "Spiritual", "okabe": "Tactical",
    "loid": "Tactical", "yor": "Physical", "senku": "Tactical", "saber": "Mythic", "gilgamesh": "Mythic",
    "kirito": "Physical", "asuna": "Physical", "johan": "Tactical", "giorno": "Spiritual", "jotaro": "Spiritual",
    "dio": "Mythic", "kenshin": "Physical", "thorfinn": "Physical", "anya": "Spiritual", "spike": "Physical",
    "yami": "Cursed", "asta": "Physical", "yuno": "Elemental", "natsu": "Elemental", "erza": "Physical",
    "lucy": "Spiritual", "gray": "Elemental", "shinobu": "Elemental", "giyu": "Elemental", "muzan": "Mythic",
    "akaza": "Physical", "hinata": "Spiritual", "shoyo": "Physical", "kageyama": "Tactical", "tooru": "Tactical",
}

def _tokens(text):
    return {w for w in "".join(c.lower() if c.isalnum() else " " for c in text).split() if len(w) > 1 or w == "l"}

def lore_type(name, anime):
    toks = _tokens(name)
    for key, t in CHARACTER_TYPE.items():
        if _tokens(key) <= toks:
            return t
    a = anime.lower()
    for key, t in ANIME_TYPE.items():
        if key in a:
            return t
    return None

ROLE_BONUS = {"MAIN": 3, "SUPPORTING": 0, "BACKGROUND": -4, "UNKNOWN": -2}

def compute_gold_cost(overall):
    if overall is None:
        return None
    if overall >= 90:
        return 15000000
    elif overall >= 80:
        return 12000000
    elif overall >= 70:
        return 9000000
    elif overall >= 60:
        return 7000000
    else:
        return 5000000

def make_stats(character_id, popularity, role, name='', anime=''):
    """popularity is 0..1 (1 = most favourited). Seeded by id so reruns give the same stats."""
    rng = random.Random(int(character_id))
    base = 52 + 40 * popularity ** 1.6 + ROLE_BONUS.get(role, 0) + rng.uniform(-3, 3)
    power_type = rng.choice(POWER_TYPES)  # still drawn so the stat stream stays stable
    power_type = lore_type(name, anime) or power_type
    bias = TYPE_BIAS[power_type]
    stats = {s: max(1, min(99, round(base + bias.get(s, 0) + rng.uniform(-8, 8)))) for s in STATS}
    overall = round(sum(stats.values()) / len(stats))
    return {"power_type": power_type, **stats, "overall": overall, "gold_cost": compute_gold_cost(overall)}

def add_stats(df):
    popularity = df["favourites"].rank(pct=True)
    rows = [make_stats(cid, pop, role, n, a) for cid, pop, role, n, a in zip(df["character_id"], popularity, df["role"], df["name"], df["anime_title"])]
    stats = pd.DataFrame(rows, index=df.index)
    for col in stats.columns:
        df[col] = stats[col]

    # shortcut: traits and awakenings are not designed yet, columns stay empty until they are
    for col in ["trait_1", "trait_2", "awakening_name", "awakening_trigger", "awakening_boost"]:
        df[col] = None

    df["is_active"] = True
    print(f"Stats generated: overall {df.overall.min()}-{df.overall.max()}, median {df.overall.median()}")
    return df

def transform():
    df = load_raw_data()
    df = clean_data(df)
    df = add_stats(df)

    output_path = os.path.join(os.path.dirname(__file__), "data", "characters_transformed.csv")
    df.to_csv(output_path, index=False)
    print(f"Transformed data saved to {output_path}")
    print(f"Final shape: {df.shape[0]} rows, {df.shape[1]} columns")
    return df

if __name__ == "__main__":
    transform()