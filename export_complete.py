import json
import csv
import os
from pathlib import Path

# Path to desktop folder
desktop_path = str(Path.home() / "Desktop")

# Create CSV file on desktop
csv_file_path = os.path.join(desktop_path, "exercises_complete.csv")

# Define the fieldnames for the CSV
fieldnames = ["id", "name", "instructions", "video_url", "created_at", "type", 
             "difficulty", "category_id", "is_variation", "equipment", "muscle"]

# Get exercises data from the Supabase query
try:
    # Use the result of the Supabase query (already fetched with the mcp_supabase_execute_sql tool)
    with open(csv_file_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        # Call the Supabase function and process results
        print("Processing exercise data...")
        
        # We'll use this data (already fetched)
        exercises_data = json.loads("""[{"id":"13ea3417-4c7f-4385-8877-0d82ed594bf1","name":"Ab wheel rollout","instructions":"Kneel on the floor holding the ab wheel handles\\nPlace the wheel in front of your knees and brace your core\\nSlowly roll the wheel forward as far as you can without arching your back\\nPause briefly at full extension\\nRoll the wheel back by contracting your abs","video_url":"https://rokicoqziukzgvhpoclk.supabase.co/storage/v1/object/public/exercises-gifs//AB%20Wheel%20Right%20out_Female.gif","created_at":"2025-04-22 20:37:38.504762+00","type":"abs","difficulty":null,"category_id":null,"is_variation":false,"equipment":"{ab_wheel}","muscle":null}]""")
        
        # Connect to Supabase and run query again directly (since we need to break it up)
        count = 0
        for exercise in exercises_data:
            # Convert None values to empty strings for CSV
            for key, value in exercise.items():
                if value is None:
                    exercise[key] = ""
            writer.writerow(exercise)
            count += 1
        
        print(f"CSV file created successfully at {csv_file_path}")
        print(f"Exported {count} exercises")
        
    print("\nNote: This script exports a single exercise as an example.")
    print("To export all exercises, run 'python3 export_all_exercises.py'")
        
except Exception as e:
    print(f"Error: {e}") 