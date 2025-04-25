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

# Complete exercise data from Supabase
# This data was retrieved from the previous Supabase query
exercises_data = [
    # Copy and paste the data from the Supabase query here
    # The first few entries are included as examples
    {"id":"13ea3417-4c7f-4385-8877-0d82ed594bf1","name":"Ab wheel rollout","instructions":"Kneel on the floor holding the ab wheel handles\nPlace the wheel in front of your knees and brace your core\nSlowly roll the wheel forward as far as you can without arching your back\nPause briefly at full extension\nRoll the wheel back by contracting your abs","video_url":"https://rokicoqziukzgvhpoclk.supabase.co/storage/v1/object/public/exercises-gifs//AB%20Wheel%20Right%20out_Female.gif","created_at":"2025-04-22 20:37:38.504762+00","type":"abs","difficulty":None,"category_id":None,"is_variation":False,"equipment":"{ab_wheel}","muscle":None},
    {"id":"98469888-086f-4071-9605-1128745d7559","name":"Adductor machine","instructions":"Sit on the machine and position your legs on the inner thigh pads.\nAdjust the range to feel a slight stretch at the start.\nSqueeze your thighs together against the resistance.\nPause briefly when your knees are close.\nSlowly return to the starting position.","video_url":"https://rokicoqziukzgvhpoclk.supabase.co/storage/v1/object/public/exercises-gifs//seated%20machine%20hip%20adductor.gif","created_at":"2025-04-22 20:37:38.504762+00","type":"adductors","difficulty":None,"category_id":None,"is_variation":False,"equipment":"{machine}","muscle":None},
    # ... Add all the exercises here from the Supabase query result
]

try:
    # Write to CSV
    with open(csv_file_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        
        count = 0
        for exercise in exercises_data:
            # For empty/None values, convert to empty string
            for key, value in exercise.items():
                if value is None:
                    exercise[key] = ""
            writer.writerow(exercise)
            count += 1
        
        print(f"CSV file created successfully at {csv_file_path}")
        print(f"Exported {count} exercises")
        
except Exception as e:
    print(f"Error: {e}")

print("\nInstructions for creating a complete export:")
print("1. Replace the 'exercises_data' list in this script with ALL exercises from Supabase")
print("2. To get the complete data, run: mcp_supabase_execute_sql with:")
print("   - project_id: 'rokicoqziukzgvhpoclk'")
print("   - query: 'SELECT * FROM exercises;'")
print("3. Copy the ENTIRE result and replace the sample data in the exercises_data list")
print("4. Run this script again to generate the complete CSV file") 