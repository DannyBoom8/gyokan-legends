import pandas as pd
import os

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

def add_placeholder_stats(df):
    # these will be filled manually later
    # adding them now as null columns so the schema is ready
    df["power_type"] = None
    df["strength"] = None
    df["speed"] = None
    df["defence"] = None
    df["technique"] = None
    df["magic"] = None
    df["iq"] = None
    df["aura"] = None
    df["overall"] = None
    df["gold_cost"] = None

    # coming soon columns
    df["trait_1"] = None
    df["trait_2"] = None
    df["awakening_name"] = None
    df["awakening_trigger"] = None
    df["awakening_boost"] = None

    # not active until manually reviewed
    df["is_active"] = False

    print("Placeholder stat columns added")
    return df

def transform():
    df = load_raw_data()
    df = clean_data(df)
    df = add_placeholder_stats(df)

    output_path = os.path.join(os.path.dirname(__file__), "data", "characters_transformed.csv")
    df.to_csv(output_path, index=False)
    print(f"Transformed data saved to {output_path}")
    print(f"Final shape: {df.shape[0]} rows, {df.shape[1]} columns")
    return df

if __name__ == "__main__":
    transform()