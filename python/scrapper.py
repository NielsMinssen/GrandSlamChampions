import requests
from bs4 import BeautifulSoup
import argparse
import csv
import datetime
import os
import sys
import time
from urllib.parse import urljoin

# Base URL for ATP Tour results archive with query parameters
base_url = "https://www.atptour.com/en/scores/results-archive"
player_base_url = "https://www.atptour.com"

csv_path = './data/tennis/scrap_results.csv'
csv_header = ['YEAR', 'TOURNAMENT_TYPE', 'TOURNAMENT', 'WINNER', 'NATIONALITY', 'AGE', 'HEIGHT']
first_year = 1950

# Update headers to include Referer
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
    'Referer': base_url
}

# Create a session to maintain headers across requests
session = requests.Session()
session.headers.update(headers)

# Mapping of tournament codes to their names and types
tournament_mapping = {
    '580': ('Grand Slam', 'Australian Open'),
    '520': ('Grand Slam', 'French Open'),
    '540': ('Grand Slam', 'Wimbledon'),
    '560': ('Grand Slam', 'US Open'),
    '404': ('Masters 1000', 'Indian Wells Masters'),
    '403': ('Masters 1000', 'Miami Open'),
    '410': ('Masters 1000', 'Monte-Carlo Masters'),
    '1536': ('Masters 1000', 'Madrid Open'),
    '416': ('Masters 1000', 'Italian Open'),
    '421': ('Masters 1000', 'Canadian Open'),
    '422': ('Masters 1000', 'Cincinnati Masters'),
    '5014': ('Masters 1000', 'Shanghai Masters'),
    '352': ('Masters 1000', 'Paris Masters'),
    '605': ('ATP Finals', 'ATP Finals')
}
tournament_order = [name for _, name in tournament_mapping.values()]

# Directory to save player images
images_dir = './data/images/atp'
if not os.path.exists(images_dir):
    os.makedirs(images_dir)

class RateLimited(Exception):
    pass

# GET with retries. atptour.com (behind Cloudflare) answers 429/403 when it sees too many requests:
# honour Retry-After once, then give up for this run instead of hammering the site.
def fetch(url, params=None, stream=False, retries=3):
    for attempt in range(retries):
        try:
            response = session.get(url, params=params, stream=stream, timeout=30)
            if response.status_code == 200:
                time.sleep(3)
                return response
            print(f"HTTP {response.status_code} for {response.url}")
            if response.status_code in (403, 429):
                if attempt > 0:
                    raise RateLimited(response.status_code)
                retry_after = response.headers.get('Retry-After', '')
                time.sleep(int(retry_after) if retry_after.isdigit() else 60)
                continue
        except requests.RequestException as e:
            print(f"Request error for {url}: {e}")
        time.sleep(5 * 2 ** attempt)
    return None

# Function to download an image if it doesn't already exist
def download_image(image_url, filename):
    # Check if the image already exists
    image_path = os.path.join(images_dir, filename)
    if not os.path.isfile(image_path):
        response = fetch(image_url, stream=True)
        if response:
            with open(image_path, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            print(f"Downloaded {filename}")
        else:
            print(f"Failed to download {filename}")
    else:
        print(f"Image already exists: {filename}")

# Function to scrape tournament winners and return the player's profile URL.
# Returns None if the page could not be fetched, (None, None) if there is no winner.
def scrape_winner_and_profile(year, tournament_code):
    params = {'year': year, 'tournament': tournament_code}
    response = fetch(base_url, params=params)
    if not response:
        return None
    soup = BeautifulSoup(response.content, 'html.parser')
    winner_div = soup.find('dl', class_='winner')
    if winner_div and winner_div.find('a'):
        winner_name = winner_div.find('a').get_text(strip=True)
        winner_profile_url = player_base_url + winner_div.find('a')['href']
        return winner_name, winner_profile_url
    return None, None

# Function to scrape player information
player_cache = {}
def scrape_player_info(player_url):
    if player_url in player_cache:
        return player_cache[player_url]
    image_url_relative = None
    response = fetch(player_url)
    if not response:
        return {}
    soup = BeautifulSoup(response.content, 'html.parser')
    nationality_div = soup.find('span', class_='flag')

     # Check for image in different possible classes
    image_classes = ['player-profile-hero-image', 'small-headshot','player_image']
    for img_class in image_classes:
        image_div = soup.find('div', class_=img_class)
        if image_div and image_div.find('img'):
            image_url_relative = image_div.find('img')['src']
            print(image_url_relative)
            break  # If an image is found, no need to check further

    nationality = nationality_div.get_text(strip=True) if nationality_div else 'Not available'
    player_info = {'nationality': nationality, 'image_url_relative': image_url_relative}
    player_cache[player_url] = player_info
    return player_info

def load_existing_rows():
    rows = {}
    if os.path.isfile(csv_path):
        with open(csv_path, newline='', encoding='utf-8') as file:
            for row in csv.DictReader(file):
                rows[(int(row['YEAR']), row['TOURNAMENT'])] = row
    return rows

parser = argparse.ArgumentParser(description="Scrape ATP tournament winners into " + csv_path)
parser.add_argument('--full', action='store_true', help=f"re-scrape every result since {first_year} instead of only the missing ones of the last two years")
args = parser.parse_args()

# Past winners never change: keep what is already in the CSV, so a failed request never loses data
rows = load_existing_rows()

today = datetime.date.today()
start_year = first_year if args.full or not rows else today.year - 1

fetched = failed = 0
try:
    # Loop through the years and tournament codes
    for year in range(start_year, today.year + 1):
        print("Processing year:", year)
        for tournament_code, (tournament_type, tournament_name) in tournament_mapping.items():
            if not args.full and (year, tournament_name) in rows:
                continue
            result = scrape_winner_and_profile(year, tournament_code)
            if result is None:
                failed += 1
                continue
            fetched += 1
            winner_name, winner_profile_url = result
            if not winner_name:
                continue
            # Create a filename from the winner's name
            filename = f"{winner_name.replace(' ', '_')}.png"
            # The player page is only needed for the picture: skip it when we already have one
            has_image = os.path.isfile(os.path.join(images_dir, filename))
            player_info = {} if has_image and not args.full else scrape_player_info(winner_profile_url)
            # Assuming the player's image is part of the player_info
            if player_info.get('image_url_relative'):
                image_url = urljoin(winner_profile_url, player_info['image_url_relative'])
                print(image_url)
                download_image(image_url, filename)
            previous = rows.get((year, tournament_name), {})
            rows[(year, tournament_name)] = {
                'YEAR': year,
                'TOURNAMENT_TYPE': tournament_type,
                'TOURNAMENT': tournament_name,
                'WINNER': winner_name,
                'NATIONALITY': player_info.get('nationality') or previous.get('NATIONALITY', ''),
            }
except RateLimited as e:
    failed += 1
    print(f"Rate limited by atptour.com (HTTP {e}), stopping here and keeping existing data")

# Write all results, sorted by year then tournament
with open(csv_path, mode='w', newline='', encoding='utf-8') as file:
    writer = csv.DictWriter(file, fieldnames=csv_header, restval='', extrasaction='ignore')
    writer.writeheader()
    for key in sorted(rows, key=lambda k: (k[0], tournament_order.index(k[1]))):
        writer.writerow(rows[key])

print(f"Fetched {fetched} result pages, {failed} failed, {len(rows)} rows in {csv_path}")
if fetched == 0 and failed > 0:
    sys.exit("Every request failed: atptour.com is probably blocking this runner. Existing data was kept.")
