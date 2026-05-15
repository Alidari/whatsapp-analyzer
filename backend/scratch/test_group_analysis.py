import pandas as pd
import sys
import os
import json

# Add parent dir to path
sys.path.append(os.path.join(os.getcwd(), ".."))

from app.parser import parse_whatsapp_chat
from app.analyzer import run_full_analysis

def test_group_analysis():
    # File with hidden character
    filename = "‎Annen6 ile WhatsApp Sohbeti.txt"
    filepath = os.path.join("..", "data", "test_chats", filename)
    
    if not os.path.exists(filepath):
        # Try finding it if hidden char is tricky
        for f in os.listdir(os.path.join("..", "data", "test_chats")):
            if "Annen6" in f:
                filepath = os.path.join("..", "data", "test_chats", f)
                break
    
    print(f"Reading {filepath}...")
    with open(filepath, "rb") as f:
        content_bytes = f.read()
        
    try:
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            content = content_bytes.decode("utf-8-sig")
        except UnicodeDecodeError:
            content = content_bytes.decode("latin-1")
            
    print("Parsing...")
    df = parse_whatsapp_chat(content)
    print(f"Found {len(df)} messages and {df['sender'].nunique()} senders.")
    
    print("Analyzing...")
    results = run_full_analysis(df)
    
    group_dyn = results.get("group_dynamics", {})
    print("\n=== Group Dynamics ===")
    print(json.dumps(group_dyn, indent=2, ensure_ascii=False))
    
    if group_dyn.get("is_group"):
        print("\n✅ Test Passed: Group analysis successfully triggered.")
    else:
        print("\n❌ Test Failed: Group analysis not triggered.")

if __name__ == "__main__":
    test_group_analysis()
