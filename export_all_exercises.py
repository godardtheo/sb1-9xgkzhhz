"""
This script fetches all exercises from Supabase and exports them to a CSV file.
It will be run directly in the terminal using the command:
python3 export_all_exercises.py
"""

import csv
import os
import json
import sys
import subprocess
from pathlib import Path

# Path to desktop folder
desktop_path = str(Path.home() / "Desktop")
csv_file_path = os.path.join(desktop_path, "exercises_complete.csv")

# Define the fieldnames for the CSV
fieldnames = ["id", "name", "instructions", "video_url", "created_at", "type", 
             "difficulty", "category_id", "is_variation", "equipment", "muscle"]

def export_exercises():
    """
    Exports all exercises from Supabase to a CSV file.
    Run this script after you've used the Supabase MCP tool to fetch the exercises
    and saved the results to 'exercises_data.json'.
    """
    try:
        print("Exporting exercises to CSV...")
        
        # Check if the data file exists
        data_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "exercises_data.json")
        if not os.path.exists(data_file):
            print("Error: exercises_data.json file not found.")
            print("Please first run: mcp_supabase_execute_sql with the query 'SELECT * FROM exercises;'")
            print("Save the results to 'exercises_data.json' in the same directory as this script.")
            return
        
        # Load the data from the file
        with open(data_file, 'r', encoding='utf-8') as f:
            exercises_data = json.load(f)
        
        # Write to CSV
        with open(csv_file_path, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            count = 0
            for exercise in exercises_data:
                # Convert None values to empty strings for CSV
                for key, value in exercise.items():
                    if value is None:
                        exercise[key] = ""
                writer.writerow(exercise)
                count += 1
            
            print(f"CSV file created successfully at: {csv_file_path}")
            print(f"Exported {count} exercises to CSV")
    
    except Exception as e:
        print(f"Error: {e}")
        print("Please make sure the exercises_data.json file exists and is formatted correctly.")

def create_data_file():
    """
    Creates a sample exercises_data.json file with instructions.
    """
    sample_data = [
        {"id":"13ea3417-4c7f-4385-8877-0d82ed594bf1","name":"Ab wheel rollout","instructions":"Kneel on the floor holding the ab wheel handles\nPlace the wheel in front of your knees and brace your core\nSlowly roll the wheel forward as far as you can without arching your back\nPause briefly at full extension\nRoll the wheel back by contracting your abs","video_url":"https://rokicoqziukzgvhpoclk.supabase.co/storage/v1/object/public/exercises-gifs//AB%20Wheel%20Right%20out_Female.gif","created_at":"2025-04-22 20:37:38.504762+00","type":"abs","difficulty":None,"category_id":None,"is_variation":False,"equipment":"{ab_wheel}","muscle":None}
    ]
    
    data_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "exercises_data.json")
    
    # Create the sample file
    with open(data_file, 'w', encoding='utf-8') as f:
        f.write("[\n")
        f.write("  /* Replace this sample data with the full results from Supabase */\n")
        f.write("  /* Copy and paste the entire JSON result from: */\n")
        f.write("  /* mcp_supabase_execute_sql with project_id=\"rokicoqziukzgvhpoclk\" and query=\"SELECT * FROM exercises;\" */\n")
        json.dump(sample_data[0], f, indent=2)
        f.write("\n]")
    
    print(f"Created sample file at: {data_file}")
    print("Please replace the sample data with the full results from Supabase.")
    print("Then run this script again to export all exercises to CSV.")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--create-sample":
        create_data_file()
    else:
        export_exercises() 