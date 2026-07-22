import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import os
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    return conn

def load_characters(df):
    conn = get_connection()
    cursor = conn.cursor()

    records = []
    for _, row in df.iterrows():
        records.append((
            int(row["character_id"]),
            row["name"],
            row["image_url"] if pd.notna(row["image_url"]) else None,
            row["anime_title"] if pd.notna(row["anime_title"]) else None,
            row["role"] if pd.notna(row["role"]) else None,
            int(row["favourites"]),
            None,  # power_type
            None,  # strength
            None,  # speed
            None,  # defence
            None,  # technique
            None,  # magic
            None,  # iq
            None,  # aura
            None,  # overall
            None,  # gold_cost
            None,  # trait_1
            None,  # trait_2
            None,  # awakening_name
            None,  # awakening_trigger
            None,  # awakening_boost
            False  # is_active
        ))

    insert_query = """
        INSERT INTO characters (
            character_id, name, image_url, anime_title, role, favourites,
            power_type, strength, speed, defence, technique, magic, iq,
            aura, overall, gold_cost, trait_1, trait_2,
            awakening_name, awakening_trigger, awakening_boost, is_active
        ) VALUES %s
        ON CONFLICT (character_id) DO UPDATE SET
            name = EXCLUDED.name,
            image_url = EXCLUDED.image_url,
            anime_title = EXCLUDED.anime_title,
            role = EXCLUDED.role,
            favourites = EXCLUDED.favourites
    """

    chunk_size = 100
    total = len(records)

    for i in range(0, total, chunk_size):
        chunk = records[i:i + chunk_size]
        execute_values(cursor, insert_query, chunk)
        print(f"Inserted rows {i + 1}–{min(i + chunk_size, total)} of {total}")

    conn.commit()
    cursor.close()
    conn.close()
    print(f"Done — {total} characters loaded into Supabase")

def load():
    input_path = os.path.join(os.path.dirname(__file__), "data", "characters_transformed.csv")
    df = pd.read_csv(input_path)
    print(f"Loaded {len(df)} rows from transformed CSV")
    load_characters(df)

if __name__ == "__main__":
    load()