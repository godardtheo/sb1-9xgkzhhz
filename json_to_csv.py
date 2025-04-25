import csv
import json
import os

# Path to your Desktop folder
desktop_path = os.path.expanduser("~/Desktop")
csv_path = os.path.join(desktop_path, "exercises.csv")

# Define the raw JSON string from Supabase
json_data = """[{"id":"13ea3417-4c7f-4385-8877-0d82ed594bf1","name":"Ab wheel rollout","instructions":"Kneel on the floor holding the ab wheel handles\nPlace the wheel in front of your knees and brace your core\nSlowly roll the wheel forward as far as you can without arching your back\nPause briefly at full extension\nRoll the wheel back by contracting your abs","video_url":"https://rokicoqziukzgvhpoclk.supabase.co/storage/v1/object/public/exercises-gifs//AB%20Wheel%20Right%20out_Female.gif","created_at":"2025-04-22 20:37:38.504762+00","type":"abs","difficulty":null,"category_id":null,"is_variation":false,"equipment":"{ab_wheel}","muscle":null},{"id":"98469888-086f-4071-9605-1128745d7559","name":"Adductor machine","instructions":"Sit on the machine and position your legs on the inner thigh pads.\nAdjust the range to feel a slight stretch at the start.\nSqueeze your thighs together against the resistance.\nPause briefly when your knees are close.\nSlowly return to the starting position.","video_url":"https://rokicoqziukzgvhpoclk.supabase.co/storage/v1/object/public/exercises-gifs//seated%20machine%20hip%20adductor.gif","created_at":"2025-04-22 20:37:38.504762+00","type":"adductors","difficulty":null,"category_id":null,"is_variation":false,"equipment":"{machine}","muscle":null},{"id":"642c55da-6cb9-4a69-91b2-c4ecbe17ec21","name":"Arnold press","instructions":"Sit on a bench with back support, holding dumbbells at shoulder height, palms facing you.\nRotate your palms outward as you press the weights overhead.\nLock out at the top.\nReverse the motion to return.\nRepeat with control.","video_url":"https://rokicoqziukzgvhpoclk.supabase.co/storage/v1/object/public/exercises-gifs//arnold%20press%20dumbbell.gif","created_at":"2025-04-22 20:37:38.504762+00","type":"shoulders","difficulty":null,"category_id":null,"is_variation":false,"equipment":"{dumbbell}","muscle":null},{"id":"9c98cc8a-383c-40e1-96ef-342ea7b27c51","name":"Back extension","instructions":"Position yourself on the back extension bench.\nCross your arms or place hands behind head.\nBend at the waist to lower torso.\nRaise back up until body is straight.\nRepeat.","video_url":"https://rokicoqziukzgvhpoclk.supabase.co/storage/v1/object/public/exercises-gifs//back%20extension%20machine%20full%20hd.gif","created_at":"2025-04-22 20:37:38.504762+00","type":"lower_back","difficulty":null,"category_id":null,"is_variation":false,"equipment":"{bench}","muscle":null},{"id":"b943ad86-373b-4bbd-aa33-1966433c3464","name":"Barbell curl","instructions":"Stand upright holding a barbell with an underhand grip.\nKeep elbows close to your sides and chest up.\nCurl the bar toward your shoulders by flexing your elbows.\nSqueeze your biceps at the top.\nLower the bar slowly to the start.","video_url":"https://rokicoqziukzgvhpoclk.supabase.co/storage/v1/object/public/exercises-gifs//Barbell%20Curl_female.gif","created_at":"2025-04-22 20:37:38.504762+00","type":"biceps","difficulty":null,"category_id":null,"is_variation":false,"equipment":"{barbell}","muscle":null}]"""

# Parse the JSON data
exercises = json.loads(json_data)

# Define the fields for the CSV
fields = [
    'id', 'name', 'instructions', 'video_url', 'created_at', 
    'type', 'difficulty', 'category_id', 'is_variation', 
    'equipment', 'muscle'
]

# Write to CSV
with open(csv_path, 'w', newline='') as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=fields)
    writer.writeheader()
    
    # Write each exercise to the CSV
    for exercise in exercises:
        writer.writerow(exercise)

print(f"CSV file created successfully at {csv_path}")
print(f"Exported {len(exercises)} exercises") 