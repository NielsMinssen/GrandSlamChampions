import requests
from bs4 import BeautifulSoup
import csv
import datetime
import os
from urllib.parse import urljoin

# Base URL for ATP Tour results archive with query parameters
base_url = "https://www.atptour.com/en/scores/results-archive"
player_base_url = "https://www.atptour.com"

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

# Directory to save player images
images_dir = './data/images/atp'
if not os.path.exists(images_dir):
    os.makedirs(images_dir)

# Function to download an image if it doesn't already exist
def download_image(image_url, filename):
    # Check if the image already exists
    image_path = os.path.join(images_dir, filename)
    if not os.path.isfile(image_path):
        response = session.get(image_url, stream=True)
        if response.status_code == 200:
            with open(image_path, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            print(f"Downloaded {filename}")
        else:
            print(f"Failed to download {filename}",response.status_code)
    else:
        print(f"Image already exists: {filename}")

# Function to scrape tournament winners and return the player's profile URL
def scrape_winner_and_profile(year, tournament_code):
    params = {'year': year, 'tournamentId': tournament_code}
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
    }
    response = session.get(base_url, headers=headers, params=params)
    if response.status_code == 200:
        soup = BeautifulSoup(response.content, 'html.parser')
        winner_div = soup.find('div', class_='tourney-detail-winner')
        if winner_div:
            winner_name = winner_div.find('a').get_text(strip=True)
            winner_profile_url = player_base_url + winner_div.find('a')['href']
            return winner_name, winner_profile_url
    return None, None

# Function to scrape player information
def scrape_player_info(player_url):
    image_url_relative = None
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
    }
    response = session.get(player_url, headers=headers)
    if response.status_code == 200:
        soup = BeautifulSoup(response.content, 'html.parser')
        nationality_div = soup.find('div', class_='player-flag-code')
        age_div = soup.find('div', class_='table-big-value')
        height_div = soup.find('span', class_='table-height-cm-wrapper')

         # Check for image in different possible classes
        image_classes = ['player-profile-hero-image', 'small-headshot']
        for img_class in image_classes:
            image_div = soup.find('div', class_=img_class)
            if image_div and image_div.find('img'):
                image_url_relative = image_div.find('img')['src']
                print(image_url_relative)
                break  # If an image is found, no need to check further

        nationality = nationality_div.get_text(strip=True) if nationality_div else 'Not available'
        age = age_div.get_text(strip=True) if age_div else 'Not available'
        height = height_div.get_text(strip=True) if height_div else 'Not available'
        player_info = {'nationality': nationality, 'age': age, 'height': height, 'image_url_relative': image_url_relative}
        return player_info
    return {}

# Open a CSV file to write results
with open('./data/tennis/scrap_results.csv', mode='w', newline='') as file:
    writer = csv.writer(file)
    writer.writerow(['YEAR', 'TOURNAMENT_TYPE', 'TOURNAMENT', 'WINNER', 'NATIONALITY', 'AGE', 'HEIGHT'])

    today = datetime.date.today()
    year_to_process = today.year + 1

        # Loop through the years and tournament codes
    for year in range(1950, year_to_process):
        print("Processing year:", year)
        for tournament_code, (tournament_type, tournament_name) in tournament_mapping.items():
            winner_name, winner_profile_url = scrape_winner_and_profile(year, tournament_code)
            if winner_name:
                player_info = scrape_player_info(winner_profile_url) if winner_profile_url else {}
                # Assuming the player's image is part of the player_info
                image_url = urljoin(winner_profile_url,player_info.get('image_url_relative'))
                print(image_url)
                if image_url:
                    # Create a filename from the winner's name
                    filename = f"{winner_name.replace(' ', '_')}.png"
                    download_image(image_url, filename)
                writer.writerow([
                    year,
                    tournament_type,
                    tournament_name,
                    winner_name,
                    player_info.get('nationality', ''),
                    player_info.get('age', ''),
                    player_info.get('height', '')
                ])