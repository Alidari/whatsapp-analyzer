import json
import os
import sys

sys.path.append(os.path.join(os.getcwd(), 'backend'))
from app.parser import parse_whatsapp_chat
from app.analyzer import analyze_vibe_check

file_path = "backend/data/test_chats/Balkız ile WhatsApp Sohbeti.txt"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

df = parse_whatsapp_chat(content)
results = analyze_vibe_check(df)

print(json.dumps(results, indent=2, ensure_ascii=False))
