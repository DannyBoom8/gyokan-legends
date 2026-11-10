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

def make_stats(character_id, popularity, role):
    """popularity is 0..1 (1 = most favourited). Seeded by id so reruns give the same stats."""
    rng = random.Random(int(character_id))
    base = 52 + 40 * popularity ** 1.6 + ROLE_BONUS.get(role, 0) + rng.uniform(-3, 3)
    power_type = rng.choice(POWER_TYPES)
    bias = TYPE_BIAS[power_type]
    stats = {s: max(1, min(99, round(base + bias.get(s, 0) + rng.uniform(-8, 8)))) for s in STATS}
    overall = round(sum(stats.values()) / len(stats))
    return {"power_type": power_type, **stats, "overall": overall, "gold_cost": compute_gold_cost(overall)}

def add_stats(df):
    popularity = df["favourites"].rank(pct=True)
    rows = [make_stats(cid, pop, role) for cid, pop, role in zip(df["character_id"], popularity, df["role"])]
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