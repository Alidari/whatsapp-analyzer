"""
Backend Test — GERÇEK WhatsApp sohbet dosyası ile test.
Ali & Ceyda sohbeti (147K satır, 6.4MB)
"""
import sys
import json
import time

sys.path.insert(0, ".")

from app.parser import parse_whatsapp_chat, get_parse_summary
from app.analyzer import run_full_analysis

# Gerçek sohbet dosyasını oku
print("=" * 65)
print("  📱 WhatsApp Chat Analyzer — GERÇEK VERİ TESTİ")
print("=" * 65)

with open("../messages/chat.txt", "r", encoding="utf-8") as f:
    content = f.read()

print(f"\n📂 Dosya boyutu: {len(content):,} karakter ({len(content) / 1024 / 1024:.1f} MB)")

# 1. Parse
print("\n🔍 Parsing...")
t0 = time.time()
df = parse_whatsapp_chat(content)
t_parse = time.time() - t0
summary = get_parse_summary(df)
print(f"  ✅ {summary['total_messages']:,} mesaj parse edildi ({t_parse:.2f}s)")
print(f"  👥 Kişiler: {', '.join(summary['senders'])}")
print(f"  📅 Tarih aralığı: {summary['date_range']['start'][:10]} → {summary['date_range']['end'][:10]}")
print(f"  📝 Metin: {summary['text_messages']:,}, 📷 Medya: {summary['media_messages']:,}")

# 2. Analiz
print("\n🧠 Analiz çalıştırılıyor...")
t1 = time.time()
results = run_full_analysis(df)
t_analysis = time.time() - t1

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
    print(f"\n{'─' * 55}")
    print(f"  {title}")
    print(f"{'─' * 55}")
    data = results[key]

    if key == "general":
        print(f"  Toplam mesaj: {data['total_messages']:,}")
        print(f"  Toplam kelime: {data['total_words']:,}")
        print(f"  Kitap eşdeğeri: {data['book_equivalent_pages']:,} sayfa")
        print(f"  Günlük ortalama: {data['daily_average']} mesaj")
        print(f"  En yoğun gün: {data['busiest_day']['date']} ({data['busiest_day']['count']} mesaj)")
        print(f"  En aktif saat: {data['peak_hour']}:00")
        print(f"  En aktif gün: {data['peak_day_name']}")
        for s, d in data["per_sender"].items():
            print(f"    {s}: {d['message_count']:,} mesaj (%{d['message_pct']})")

    elif key == "vibe_check":
        print(f"  Genel mood: {data['mood_label_tr']}")
        print(f"  Pozitif: %{data['positive_pct']}, Negatif: %{data['negative_pct']}, Nötr: %{data['neutral_pct']}")
        for s, d in data["per_sender"].items():
            print(f"    {s}: +%{d['positive_pct']} / -%{d['negative_pct']} (ort: {d['avg_sentiment']})")

    elif key == "argument_score":
        print(f"  Gerginlik Endeksi: {data['tension_index']}/100 → {data['tension_label']}")
        print(f"  CAPS LOCK Kralı: {data['caps_lock_king']}")
        print(f"  Ünlem Şampiyonu: {data['exclamation_champion']}")
        for s, d in data["per_sender"].items():
            print(f"    {s}: CAPS {d['caps_lock_count']}x, ünlem {d['exclamation_count']}x, spam {d['spam_bursts']}x")

    elif key == "peace_ambassador":
        print(f"  🕊️ Barış Elçisi: {data['ambassador']}")
        for s, d in data["per_sender"].items():
            phrases = ", ".join([f"'{p['phrase']}' ({p['count']}x)" for p in d["top_phrases"][:3]])
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
            print(f"    {s}: ort {d['avg_response_minutes']}dk, medyan {d['median_response_minutes']}dk, ghost {d['ghost_count']}x")

    elif key == "message_style":
        print(f"  📖 Roman Yazarı: {data['novelist']}")
        print(f"  📟 Telgrafçı: {data['telegraphist']}")
        for s, d in data["per_sender"].items():
            print(f"    {s}: ort {d['avg_words']} kelime, toplam {d['total_words']:,} kelime, tek kelime %{d['one_word_pct']}")

    elif key == "emoji_universe":
        print(f"  Toplam emoji: {data['total_emojis']:,}")
        print(f"  👑 Emoji Şampiyonu: {data['emoji_champion']}")
        for s, d in data["per_sender"].items():
            top3 = " ".join([f"{e['emoji']}({e['count']})" for e in d["top_3"]])
            print(f"    {s}: {d['total']:,} emoji, msj başı {d['emoji_per_message']}, top3: {top3}")

    elif key == "word_cloud":
        for s, words in data["per_sender"].items():
            top7 = ", ".join([f"{w['word']}({w['count']})" for w in words[:7]])
            print(f"    {s}: {top7}")

    elif key == "timeline":
        print(f"  Aylık veri: {len(data['monthly'])} ay")
        print(f"  Heatmap: {len(data['heatmap'])} hücre")
        # En yoğun 3 ay
        sorted_months = sorted(data['monthly'], key=lambda x: x['count'], reverse=True)
        for m_item in sorted_months[:3]:
            print(f"    📅 {m_item['month']}: {m_item['count']} mesaj")

# JSON çıktı boyutu
json_output = json.dumps(results, ensure_ascii=False, default=str)
print(f"\n{'=' * 65}")
print(f"  ⏱️  Parse süresi: {t_parse:.2f}s")
print(f"  ⏱️  Analiz süresi: {t_analysis:.2f}s")
print(f"  ⏱️  Toplam süre: {t_parse + t_analysis:.2f}s")
print(f"  📦 JSON boyutu: {len(json_output):,} karakter")
print(f"  ✅ Tüm metrikler başarıyla hesaplandı!")
print(f"{'=' * 65}")
