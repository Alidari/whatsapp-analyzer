import os
import sys
import json

sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.parser import parse_whatsapp_chat
from app.analyzer import analyze_argument_score

def test_file(file_path):
    print(f"\n--- Testing {os.path.basename(file_path)} ---")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        df = parse_whatsapp_chat(content)
        results = analyze_argument_score(df)
        
        print(f"Tension Index: {results['tension_index']}")
        print(f"Tension Label: {results['tension_label']}")
        print(f"Total Negative Messages (ML Based): {sum(s['negative_msgs_count'] for s in results['per_sender'].values())}")
    except Exception as e:
        print(f"Error testing {os.path.basename(file_path)}: {e}")

test_dir = "backend/data/test_chats"
for file in os.listdir(test_dir):
    if file.endswith(".txt"):
        test_file(os.path.join(test_dir, file))
