import json
import os
import sys

sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.parser import parse_whatsapp_chat
from app.analyzer import analyze_argument_score

file_path = "backend/data/test_chats/toxic_chat.txt"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

df = parse_whatsapp_chat(content)
results = analyze_argument_score(df)

print(json.dumps(results, indent=2, ensure_ascii=False))
