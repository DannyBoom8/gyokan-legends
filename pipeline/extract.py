import requests
import csv
import time
import os
from dotenv import load_dotenv

load_dotenv()

API_URL = "https://graphql.anilist.co"

QUERY = """
query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
        pageInfo {
            hasNextPage
            total
        }
        characters(sort: FAVOURITES_DESC) {
            id
            name {
                full
            }
            image {
                large
            }
            favourites
            media(perPage: 1, sort: POPULARITY_DESC, type: ANIME) {
                edges {
                    characterRole
                    node {
                        title {
                            romaji
                            english
                        }
                    }
                }
            }
        }
    }
}
"""

def fetch_page(page):
    variables = {"page": page, "perPage": 25}
    response = requests.post(
        API_URL,
        json={"query": QUERY, "variables": variables},
        headers={"Content-Type": "application/json"}
    )

    if response.status_code == 200:
        return response.json()
    elif response.status_code == 429:
        print(f"Rate limited on page {page} — waiting 60 seconds...")
        time.sleep(60)
        return fetch_page(page)
    else:
        print(f"Error on page {page}: {response.status_code}")
        return None

def extract():
    all_characters = []
    page = 1
    total_pages = 80

    print("Starting extraction from AniList...")

    while page <= total_pages:
        print(f"Fetching page {page} of {total_pages}...")
        data = fetch_page(page)

        if not data:
            print(f"Skipping page {page} — no data returned")
            page += 1
            continue

        characters = data["data"]["Page"]["characters"]

        for char in characters:
            media_edges = char["media"]["edges"]

            if media_edges:
                role = media_edges[0]["characterRole"]
                node = media_edges[0]["node"]
                anime_title = node["title"]["english"] or node["title"]["romaji"]
            else:
                role = None
                anime_title = None

            all_characters.append({
                "character_id": char["id"],
                "name": char["name"]["full"],
                "image_url": char["image"]["large"],
                "favourites": char["favourites"],
                "role": role,
                "anime_title": anime_title
            })

        has_next = data["data"]["Page"]["pageInfo"]["hasNextPage"]
        if not has_next:
            print(f"No more pages after page {page}")
            break

        page += 1
        time.sleep(0.8)

    print(f"Extraction complete — {len(all_characters)} characters pulled")
    return all_characters

def save_to_csv(characters):
    output_path = os.path.join(os.path.dirname(__file__), "data", "characters_raw.csv")
    fieldnames = ["character_id", "name", "image_url", "favourites", "role", "anime_title"]

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(characters)

    print(f"Saved to {output_path}")

if __name__ == "__main__":
    characters = extract()
    save_to_csv(characters)