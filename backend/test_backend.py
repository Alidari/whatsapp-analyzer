"""
Backend Test Script — Parser ve Analyzer modüllerini test eder.
"""
import sys
import json

sys.path.insert(0, ".")

from app.parser import parse_whatsapp_chat, get_parse_summary
from app.analyzer import run_full_analysis

# Test dosyasını oku
with open("test_chat.txt", "r", encoding="utf-8") as f:
    content = f.read()

print("=" * 60)
print("  📱 WhatsApp Chat Analyzer — Backend Test")
print("=" * 60)

# 1. Parse
print("\n🔍 Parsing...")
df = parse_whatsapp_chat(content)
summary = get_parse_summary(df)
print(f"  ✅ {summary['total_messages']} mesaj başarıyla parse edildi")
print(f"  👥 Kişiler: {', '.join(summary['senders'])}")
print(f"  📅 Tarih aralığı: {summary['date_range']['start'][:10]} → {summary['date_range']['end'][:10]}")
print(f"  📝 Metin: {summary['text_messages']}, 📷 Medya: {summary['media_messages']}")

# 2. Analiz
print("\n🧠 Analiz çalıştırılıyor...")
results = run_full_analysis(df)

# Sonuçları güzelce yazdır
sections = {
    "general": "📊 Genel İstatistikler",
    "vibe_check": "💕 Vibe Check (Duygu Analizi)",
    "argument_score": "🔥 Tartışma Skoru",
    "peace_ambassador": "🕊️ Barış Elçisi",
    "streak": "🔥 Konuşma Streaki",
    "night_owl": "🦉 Gece Kuşu vs Erkenci Kuş",
    "response_times": "⏱️ Yanıt Süreleri",
    "message_style": "✍️ Mesaj Tarzı",
    "emoji_universe": "😍 Emoji Evreni",
    "word_cloud": "☁️ Kelime Bulutu",
    "timeline": "📈 Zaman Serisi",
}

for key, title in sections.items():
    print(f"\n{'─' * 50}")
    print(f"  {title}")
    print(f"{'─' * 50}")
    data = results[key]

    if key == "general":
        print(f"  Toplam mesaj: {data['total_messages']}")
        print(f"  Toplam kelime: {data['total_words']}")
        print(f"  Kitap eşdeğeri: {data['book_equivalent_pages']} sayfa")
        print(f"  Günlük ortalama: {data['daily_average']} mesaj")
        print(f"  En yoğun gün: {data['busiest_day']['date']} ({data['busiest_day']['count']} mesaj)")
        print(f"  En aktif saat: {data['peak_hour']}:00")
        for s, d in data["per_sender"].items():
            print(f"    {s}: {d['message_count']} mesaj (%{d['message_pct']})")

    elif key == "vibe_check":
        print(f"  Genel mood: {data['mood_label_tr']}")
        print(f"  Pozitif: %{data['positive_pct']}, Negatif: %{data['negative_pct']}, Nötr: %{data['neutral_pct']}")
        for s, d in data["per_sender"].items():
            print(f"    {s}: +%{d['positive_pct']} / -%{d['negative_pct']} (ort: {d['avg_sentiment']})")

    elif key == "argument_score":
        print(f"  Gerginlik Endeksi: {data['tension_index']}/100 → {data['tension_label']}")
        print(f"  CAPS LOCK Kralı: {data['caps_lock_king']}")
        print(f"  Ünlem Şampiyonu: {data['exclamation_champion']}")

    elif key == "peace_ambassador":
        print(f"  🕊️ Barış Elçisi: {data['ambassador']}")
        for s, d in data["per_sender"].items():
            phrases = ", ".join([f"'{p['phrase']}' ({p['count']}x)" for p in d["top_phrases"]])
            print(f"    {s}: {d['peace_count']} barışçıl ifade — {phrases}")

    elif key == "streak":
        print(f"  En uzun streak: {data['longest_streak']} gün 🔥")
        print(f"  Streak: {data['streak_start']} → {data['streak_end']}")
        print(f"  Aktif gün: {data['total_active_days']}/{data['total_days_span']} (%{data['activity_rate_pct']})")

    elif key == "night_owl":
        print(f"  🦉 Gece Kuşu: {data['night_owl']}")
        print(f"  🐦 Erkenci Kuş: {data['early_bird']}")
        for s, d in data["per_sender"].items():
            print(f"    {s}: Gece %{d['night_pct']}, Sabah %{d['morning_pct']}, Zirve: {d['peak_hour']}:00")

    elif key == "response_times":
        print(f"  ⚡ En hızlı: {data['fastest_responder']}")
        print(f"  🐌 En yavaş: {data['slowest_responder']}")
        print(f"  📝 {data['fun_fact']}")
        for s, d in data["per_sender"].items():
            print(f"    {s}: ort {d['avg_response_minutes']}dk, ghost {d['ghost_count']}x")

    elif key == "message_style":
        print(f"  📖 Roman Yazarı: {data['novelist']}")
        print(f"  📟 Telgrafçı: {data['telegraphist']}")
        for s, d in data["per_sender"].items():
            print(f"    {s}: ort {d['avg_words']} kelime, tek kelime %{d['one_word_pct']}")

    elif key == "emoji_universe":
        print(f"  Toplam emoji: {data['total_emojis']}")
        print(f"  👑 Emoji Şampiyonu: {data['emoji_champion']}")
        for s, d in data["per_sender"].items():
            top3 = " ".join([e["emoji"] for e in d["top_3"]])
            print(f"    {s}: {d['total']} emoji, top3: {top3}")

    elif key == "word_cloud":
        for s, words in data["per_sender"].items():
            top5 = ", ".join([f"{w['word']}({w['count']})" for w in words[:5]])
            print(f"    {s}: {top5}")

    elif key == "timeline":
        print(f"  Aylık veri: {len(data['monthly'])} ay")
        print(f"  Heatmap: {len(data['heatmap'])} hücre")

# JSON çıktı boyutu
json_output = json.dumps(results, ensure_ascii=False, default=str)
print(f"\n{'=' * 60}")
print(f"  ✅ JSON boyutu: {len(json_output)} karakter")
print(f"  ✅ Tüm metrikler başarıyla hesaplandı!")
print(f"{'=' * 60}")
