import csv
import json
import os
import requests

# Path to save the CSV file on your desktop
desktop_path = os.path.expanduser("~/Desktop")
csv_path = os.path.join(desktop_path, "exercises.csv")

# Supabase API configuration
SUPABASE_URL = "https://rokicoqziukzgvhpoclk.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJva2ljb3F6aXVremd2aHBvY2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTA0MjI4MjcsImV4cCI6MjAyNTk5ODgyN30.yJfUoEUf2R7oUFjqQEItsYcF-pL7IvYoC2pHvNi2Z3g"  # Anonymous key (public)

# Fetch exercises from Supabase
def fetch_exercises():
    url = f"{SUPABASE_URL}/rest/v1/exercises"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    
    print("Fetching exercises from Supabase...")
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        exercises = response.json()
        print(f"Successfully fetched {len(exercises)} exercises")
        return exercises
    else:
        print(f"Error fetching data: {response.status_code}")
        print(response.text)
        return []

# Export exercises to CSV
def export_to_csv(exercises):
    # Define the CSV fields (columns)
    fields = ["id", "name", "type", "muscle", "instructions", "equipment", "video_url", 
              "difficulty", "category_id", "is_variation", "created_at"]
    
    print(f"Writing {len(exercises)} exercises to CSV...")
    with open(csv_path, 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fields)
        writer.writeheader()
        writer.writerows(exercises)
    
    print(f"CSV file created at: {csv_path}")
    print(f"Exported {len(exercises)} exercises to CSV")

if __name__ == "__main__":
    # Fetch exercises from Supabase
    exercises = fetch_exercises()
    
    # Export to CSV if exercises were retrieved
    if exercises:
        export_to_csv(exercises)
    else:
        print("No exercises to export") 