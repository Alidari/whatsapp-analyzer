"""
WhatsApp Chat Analyzer — Eğlenceli Metrikler Motoru
====================================================
Pandas + NLP (VADER, TextBlob, Emoji) ile "Spotify Wrapped" tarzı
eğlenceli metrikleri hesaplayan ana modül.

Ürettiği metrikler:
  A. İlişki Dinamikleri  → Vibe Check, Tartışma Skoru, Barış Elçisi
  B. Zaman & Alışkanlıklar → Streak, Gece/Gündüz, Yanıt Süreleri
  C. Kelime & İfade Tarzı → Roman/Telgraf, Emoji, Kelime Bulutu
"""

import re
from collections import Counter
from datetime import timedelta
from typing import Any

import emoji
import pandas as pd
from textblob import TextBlob
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# ──────────────────────────────────────────────
#  BERT NLP Pipeline Yapılandırması
# ──────────────────────────────────────────────
_NLP_PIPELINE = None

def get_nlp_pipeline():
    global _NLP_PIPELINE
    if _NLP_PIPELINE is None:
        try:
            from transformers import pipeline
            # Use CPU (device=-1)
            print("Loading BERT Pipeline for true context ML analysis...")
            _NLP_PIPELINE = pipeline(
                "sentiment-analysis", 
                model="savasy/bert-base-turkish-sentiment-cased", 
                device=-1
            )
        except ImportError:
            _NLP_PIPELINE = False # Fallback to dict
    return _NLP_PIPELINE

# ──────────────────────────────────────────────
#  Sabitler
# ──────────────────────────────────────────────

# Türkçe bağlaçlar / stopwords (kelime bulutundan çıkarılacak)
TURKISH_STOPWORDS = {
    "ve", "bir", "bu", "da", "de", "mi", "mu", "mı", "mü", "ne", "ben", "sen",
    "ya", "ki", "ama", "ile", "için", "var", "yok", "çok", "daha", "en", "her",
    "hiç", "şey", "onu", "ona", "onu", "benim", "senin", "onun", "biz", "siz",
    "gibi", "kadar", "sonra", "önce", "olan", "oldu", "olur", "olarak", "böyle",
    "şu", "neden", "nasıl", "eğer", "ise", "hem", "hep", "bile", "artık", "sadece",
    "tabii", "işte", "yani", "evet", "hayır", "tamam", "olsun", "güzel", "iyi",
    "kötü", "bak", "gel", "git", "yap", "al", "ver", "olmuş", "etmek", "olan",
    "değil", "lazım", "tamamen", "aslında", "birşey", "herşey", "hiçbir", "herhangi",
    "zaten", "bazen", "belki", "kesinlikle", "galiba", "acaba", "hala", "henüz",
    # Kısa filler kelimeleri
    "ok", "tm", "hmm", "hm", "aa", "ee", "ha", "he", "ay", "oo", "oh", "haa",
    "yaa", "abi", "lan", "la", "lo", "le",
}

# Barış / Özür kelimeleri
PEACE_PHRASES = [
    "özür dilerim", "özür dilerimm", "özür dilerimmm", "özür dilerimmmm", "özür dilerimmmmm",
    "kusura bakma", "kusura bakmayın", "kusura bakmayin", "kusura bakmaaa",
    "haklısın", "haklisin", "pardon", "affedersin", "üzgünüm", "uzgunum", "hata yaptım", 
    "benim hatam", "sorry", "pişmanım", "pismanim", "kırmak istemezdim", "alınma", 
    "kalbini kırdıysam", "bilerek yapmadım", "barışalım", "barisalim", "küsme", "kusme",
    "canım benim özür", "affet", "affet beni", "özür dilerim canım", "özür" , "özürr","özüürr",
    "ozur dilerim", "özürr", "küsmeyelim", "barışalım", "barışalım mı"
]

# Toksik / negatif kelimeler (Türkçe günlük dil)
NEGATIVE_KEYWORDS = [
    "sinir", "kız", "kızdım", "sinirlendim", "saçmalama", "aptal", "yalan",
    "nefret", "bıktım", "yeter", "rezalet", "berbat", "iğrenç", "kötü",
    "salak", "mal", "gerizekalı", "boşver", "siktir", "kes", "defol",
    "problem", "sorun", "kavga", "tartışma", "trip", "laf",
]

# Romantik / pozitif kelimeler
POSITIVE_KEYWORDS = [
    "seviyorum", "aşkım", "canım", "güzelim", "tatlım", "özledim", "sarılmak",
    "öpücük", "kalp", "mutlu", "harika", "muhteşem", "süper", "mükemmel",
    "teşekkür", "sağol", "sağ ol", "bravo", "gurur", "sevgi", "aşk",
    "bebeğim", "hayatım", "birtanem", "güneşim", "yıldızım", "prensesim",
]


# ──────────────────────────────────────────────
#  Yardımcı Fonksiyonlar
# ──────────────────────────────────────────────

def _extract_emojis(text: str) -> list[str]:
    """Metindeki tüm emojileri listeler."""
    return [char for char in text if emoji.is_emoji(char)]


def _count_caps_ratio(text: str) -> float:
    """Büyük harf oranını hesaplar (CAPS LOCK tespiti)."""
    alpha_chars = [c for c in text if c.isalpha()]
    if len(alpha_chars) < 3:
        return 0.0
    upper_count = sum(1 for c in alpha_chars if c.isupper())
    return upper_count / len(alpha_chars)


# Global VADER instance (her mesajda yeniden oluşturmamak için)
_VADER = SentimentIntensityAnalyzer()


def _get_sentiment_score(text: str) -> float:
    """VADER + TextBlob hibrit duygu skoru (-1 ile +1 arası)."""
    vader_score = _VADER.polarity_scores(text)["compound"]

    try:
        blob_score = TextBlob(text).sentiment.polarity
    except Exception:
        blob_score = 0.0

    # Ağırlıklı ortalama (VADER genel olarak daha iyi)
    return vader_score * 0.6 + blob_score * 0.4


# ══════════════════════════════════════════════
#  A. İLİŞKİ DİNAMİKLERİ
# ══════════════════════════════════════════════

def analyze_vibe_check(df: pd.DataFrame) -> dict:
    """
    Vibe Check — Sohbetin genel duygu durumu.
    NLP (pozitif/negatif kelime + emoji) ile analiz.

    Döner: {
        "overall_mood": "Romantic" | "Toxic" | "Neutral" | "Chaotic" | "Chill",
        "positive_pct": float,
        "negative_pct": float,
        "neutral_pct": float,
        "per_sender": { sender: { positive_pct, negative_pct, neutral_pct } }
        "mood_label_tr": str,
    }
    """
    text_df = df[~df["is_media"]].copy()
    senders = text_df["sender"].unique()

    # 1. NLP Pipeline Attempt
    pipeline_api = get_nlp_pipeline()

    if pipeline_api:
        # Gerçek Yapay Zeka (BERT) Kullanımı - 2000 Mesajlık Örneklem
        sample_size = min(len(text_df), 2000)
        # Senders'a göre orantılı sample alalım
        sample_df = text_df.groupby("sender", group_keys=False).apply(
            lambda x: x.sample(n=min(len(x), sample_size // len(senders)), random_state=42)
        ).copy()

        # Uzak durulmaması gereken boş mesajları filtrele
        valid_msgs = sample_df[sample_df["message"].str.len() > 3]["message"].tolist()
        
        # Batch inference (fast array process)
        if valid_msgs:
            ml_results = pipeline_api(valid_msgs, truncation=True, max_length=128)
            
            # Map predictions back to the sample_df conceptually 
            # (We'll just map them sequentially to the valid ones)
            # label can be 'positive' or 'negative' based on `savasy` model
            pos_count = sum(1 for res in ml_results if str(res["label"]).lower() == "positive")
            neg_count = sum(1 for res in ml_results if str(res["label"]).lower() == "negative")
            
            total = len(valid_msgs) or 1
            ml_positive_pct = pos_count / total * 100
            ml_negative_pct = neg_count / total * 100
            ml_neutral_pct = max(0, 100 - ml_positive_pct - ml_negative_pct)
        else:
            ml_positive_pct, ml_negative_pct, ml_neutral_pct = 0, 0, 100
            
        positive_pct = round(ml_positive_pct, 1)
        negative_pct = round(ml_negative_pct, 1)
        neutral_pct = round(ml_neutral_pct, 1)

        # Sender based stats (Approximation using overall metrics + basic dict correlation to establish who is who)
        # To avoid running ML on 40k, we apply the native dictionary as a FAST heuristic across all messages!
        
    # Her Halükarda Native Dictionary Hesaplarız (Genel istatistikler ve fallback için)
    messages = text_df["message"].astype(str).str.lower()
    pos_emojis = ["❤️", "😂", "😍", "🔥", "💕", "🥰", "😘", "😊", "😁", "🫶", "🤍", "💖", "💘"]
    neg_emojis = ["😭", "😢", "😔", "😡", "🤬", "💔", "🙄", "😒", "🤢", "👎", "🫠", "🥱"]

    pos_counts = pd.Series(0, index=messages.index)
    for kw in POSITIVE_KEYWORDS + pos_emojis:
        pos_counts += messages.str.count(kw)

    neg_counts = pd.Series(0, index=messages.index)
    for kw in NEGATIVE_KEYWORDS + neg_emojis:
        neg_counts += messages.str.count(kw)

    text_df["pos_score"] = pos_counts
    text_df["neg_score"] = neg_counts

    if not pipeline_api:
        # Fallback 100% to dictionary values 
        positive = (text_df["pos_score"] > text_df["neg_score"]).sum()
        negative = (text_df["neg_score"] > text_df["pos_score"]).sum()
        neutral = len(text_df) - positive - negative
        total = len(text_df) or 1
        positive_pct = round(positive / total * 100, 1)
        negative_pct = round(negative / total * 100, 1)
        neutral_pct = round(neutral / total * 100, 1)

    # Mood Belirleme
    if positive_pct > 15 and positive_pct > negative_pct * 1.5:
        overall_mood = "Romantic"
        mood_label_tr = "Romantik 💕"
    elif negative_pct > 10 and negative_pct > positive_pct * 1.2:
        overall_mood = "Toxic"
        mood_label_tr = "Toksik 🔥"
    elif abs(positive_pct - negative_pct) <= 3 and (positive_pct + negative_pct) > 15:
        overall_mood = "Chaotic"
        mood_label_tr = "Kaotik 🌪️"
    elif neutral_pct > 80:
        overall_mood = "Chill"
        mood_label_tr = "Sakin ☕"
    else:
        overall_mood = "Balanced"
        mood_label_tr = "Dengeli ⚖️"

    # Buzdolabı & Drama Kraliçesi Mantığı
    ice_fridge = "Yok"
    drama_queen = "Yok"
    
    per_sender = {}
    sender_mood_swings = {}
    sender_coldness = {}

    for sender in senders:
        s_df = text_df[text_df["sender"] == sender]
        s_total = len(s_df) or 1
        s_pos = (s_df["pos_score"] > s_df["neg_score"]).sum()
        s_neg = (s_df["neg_score"] > s_df["pos_score"]).sum()
        s_neu = s_total - s_pos - s_neg
        
        # Drama index = std deviation of sentiment (high pos AND high neg usage)
        swing_score = (s_pos * s_neg) / (s_total * s_total + 1)
        sender_mood_swings[sender] = swing_score
        
        # Coldness index = extremely high neutral percentage while the relationship overall has emotion
        sender_coldness[sender] = s_neu / s_total
        
        per_sender[sender] = {
            "positive_pct": round(s_pos / s_total * 100, 1),
            "negative_pct": round(s_neg / s_total * 100, 1),
            "neutral_pct": round(s_neu / s_total * 100, 1),
            "avg_sentiment": round((s_pos - s_neg) / s_total, 3)
        }

    # Assign roles based on logic
    if sender_mood_swings:
        top_drama = max(sender_mood_swings.items(), key=lambda x: x[1])
        if top_drama[1] > 0.05: # Threshold for dramatic
            drama_queen = top_drama[0]
            
    if sender_coldness and overall_mood != "Chill":
        top_cold = max(sender_coldness.items(), key=lambda x: x[1])
        if top_cold[1] > 0.85: # Over 85% neutral
            ice_fridge = top_cold[0]

    # Extract some highlighted quotes for the new StoryMode "evidence" feature
    highlighted_quotes = {
        "romantic": [],
        "toxic": [],
    }
    
    def get_context_dialogues(target_series, n=3, context_size=1):
        top_indices = target_series[target_series > 2].nlargest(n).index
        dialogues = []
        for idx in top_indices:
            pos = df.index.get_loc(idx)
            start = max(0, pos - context_size)
            end = min(len(df), pos + context_size + 1)
            dialogue = []
            for _, row in df.iloc[start:end].iterrows():
                if row["is_media"]:
                    dialogue.append({"sender": row["sender"], "message": "[Medya]"})
                else:
                    dialogue.append({"sender": row["sender"], "message": row["message"]})
            dialogues.append(dialogue)
        return dialogues

    # Sort by pos_score to find the most "lovey-dovey" messages
    if not text_df["pos_score"].empty:
        highlighted_quotes["romantic"] = get_context_dialogues(text_df["pos_score"])
        
    # Sort by neg_score to find the most "toxic" messages
    if not text_df["neg_score"].empty:
        highlighted_quotes["toxic"] = get_context_dialogues(text_df["neg_score"])
        
    # Find the most "hilarious" messages (highest density of laugh strings)
    laugh_pattern = r"(haha|hehe|hihi|asdf|qwer|zxcv|xd|kdkd|mdmd|sldk|jsjs|sjsj|😂|🤣|😅|💀)"
    laugh_counts = text_df["message"].str.lower().str.count(laugh_pattern)
    if not text_df.empty and laugh_counts.max() > 0:
        highlighted_quotes["hilarious"] = get_context_dialogues(laugh_counts, n=3, context_size=2)
    else:
        highlighted_quotes["hilarious"] = []
        
    return {
        "overall_mood": overall_mood,
        "mood_label_tr": mood_label_tr,
        "positive_pct": positive_pct,
        "negative_pct": negative_pct,
        "neutral_pct": neutral_pct,
        "ice_fridge": ice_fridge,
        "drama_queen": drama_queen,
        "per_sender": per_sender,
        "highlighted_quotes": highlighted_quotes,
    }


def _is_aggressive_caps(message: str) -> bool:
    """
    CAPS LOCK tespitini bağlamsal olarak yapar.
    Sadece büyük harf olması yeterli değil — negatif bağlamda olmalı.
    
    Hariç tutulanlar:
    - Sevgi / romantik kelime içeren CAPS ("AŞKIM", "SEVİYORUM")
    - Kısa sevinç çığlığı ("EVET!", "HARIKA", "OF YAW")
    - Rastgele klavye dövmesi ("HDGFSDGF", "ASDFGH")
    - Emoji ağırlıklı mesajlar
    """
    m = message.strip()
    if len(m) < 5 or _count_caps_ratio(m) <= 0.7:
        return False

    m_lower = m.lower()

    # 1. Romantik / pozitif kelime içeriyorsa CAPS = coşku, gerginlik değil
    ROMANTIC_CAPS_WORDS = {
        "aşkım", "aşkımm", "aşkmm", "seviyorum", "canım", "güzelim",
        "tatlım", "harikasın", "mükemmel", "süper", "harika", "evet aşk",
        "özledim", "sarıl", "öp", "sevgilim", "birtanem", "hayatım",
        "güneşim", "bebeğim", "prensesim", "neden soruyorsun", "tabiki",
        "tabii ki", "evet", "tamam", "anlıyorum", "biliyorum",
    }
    for word in ROMANTIC_CAPS_WORDS:
        if word in m_lower:
            return False

    # 2. Rastgele klavye dövmesi — vokal/konsonan oranı çok bozuksa gerçek kelime değil
    vowels = sum(1 for c in m_lower if c in "aeıioöuüaeiou")
    alpha = sum(1 for c in m_lower if c.isalpha())
    if alpha > 3 and vowels / max(alpha, 1) < 0.15:
        # Çok az sesli harf → rastgele klavye dövmesi ("HDGFSDG")
        return False

    # 3. Mesaj sadece ünlem / emoji / kısa sevinç ifadesiyse
    stripped = re.sub(r"[!?.\s]", "", m_lower)
    if len(stripped) <= 4:
        return False

    # 4. Negatif sinyal varsa gerginlik kabul et
    NEGATIVE_CAPS_SIGNALS = [
        "yapma", "bırak", "dur", "yeter", "saçma", "kapat", "git",
        "neden", "niye", "nasıl ya", "olmaz", "aptal", "sinir",
        "kızıyor", "bıktım", "artık", "defol", "hayır", "inanmıyorum",
        "yalan", "haksız", "haksızlık", "sorun", "problem", "kötü",
    ]
    has_negative = any(neg in m_lower for neg in NEGATIVE_CAPS_SIGNALS)

    # 5. Çok fazla ünlem/soru işareti varsa gergin olabilir
    has_aggressive_punct = m.count("!") >= 2 or (m.count("?") >= 2 and not any(r in m_lower for r in ["nasılsın", "naptın", "napıyorsun"]))

    return has_negative or has_aggressive_punct


def analyze_argument_score(df: pd.DataFrame) -> dict:
    """
    Tartışma Skoru — Gerginlik endeksi.
    Sinyal: Ardışık kısa mesajlar (spam), CAPS LOCK, çoklu !/? kullanımı + ML model duygu analizi.

    Döner: {
        "tension_index": float (0-100),
        "tension_label": str,
        "caps_lock_king": str,
        "exclamation_champion": str,
        "spam_bursts": int,
        "per_sender": { ... }
    }
    """
    text_df = df[~df["is_media"]].copy()
    senders = text_df["sender"].unique()

    pipeline_api = get_nlp_pipeline()

    ml_negative_counts = {sender: 0 for sender in senders}
    fallback_negative_counts = {sender: 0 for sender in senders}

    if pipeline_api:
        sample_size = min(len(text_df), 2000)
        if sample_size > 0:
            sample_df = text_df.groupby("sender", group_keys=False).apply(
                lambda x: x.sample(n=min(len(x), max(1, sample_size // len(senders))), random_state=42)
            ).copy()
            
            valid_mask = sample_df["message"].str.len() > 3
            valid_df = sample_df[valid_mask].copy()
            valid_msgs = valid_df["message"].tolist()
            
            if valid_msgs:
                ml_results = pipeline_api(valid_msgs, truncation=True, max_length=128)
                valid_df["ml_sentiment"] = [str(res["label"]).lower() for res in ml_results]
                
                for sender in senders:
                    sender_sample = valid_df[valid_df["sender"] == sender]
                    if len(sender_sample) > 0:
                        neg_ratio = (sender_sample["ml_sentiment"] == "negative").mean()
                        sender_total_msgs = len(text_df[text_df["sender"] == sender])
                        ml_negative_counts[sender] = int(neg_ratio * sender_total_msgs)
    else:
        # Fallback sözlük yöntemi
        messages = text_df["message"].astype(str).str.lower()
        neg_emojis = ["😭", "😢", "😔", "😡", "🤬", "💔", "🙄", "😒", "🤢", "👎", "🫠", "🥱"]
        neg_counts = pd.Series(0, index=messages.index)
        for kw in NEGATIVE_KEYWORDS + neg_emojis:
            neg_counts += messages.str.count(kw)
        
        text_df["fallback_neg_score"] = neg_counts
        for sender in senders:
            sender_df = text_df[text_df["sender"] == sender]
            fallback_negative_counts[sender] = (sender_df["fallback_neg_score"] > 0).sum()

    per_sender = {}
    for sender in senders:
        s_df = text_df[text_df["sender"] == sender]
        total = len(s_df) or 1

        # CAPS LOCK mesaj sayısı
        caps_msgs = s_df["message"].apply(_is_aggressive_caps).sum()

        # Çoklu ünlem/soru işareti
        excl_msgs = s_df["message"].apply(
            lambda m: m.count("!") >= 2 or m.count("?") >= 3
        ).sum()

        # Kısa ardışık mesajlar (spam burst)
        short_mask = s_df["char_count"].values < 15
        spam_count = 0
        consecutive = 0
        for is_short in short_mask:
            if is_short:
                consecutive += 1
                if consecutive >= 3:
                    spam_count += 1
            else:
                consecutive = 0

        neg_count = ml_negative_counts[sender] if pipeline_api else fallback_negative_counts[sender]

        per_sender[sender] = {
            "caps_lock_count": int(caps_msgs),
            "caps_lock_pct": round(caps_msgs / total * 100, 1),
            "exclamation_count": int(excl_msgs),
            "spam_bursts": int(spam_count),
            "negative_msgs_count": int(neg_count),
        }

    # Genel gerginlik endeksi (0-100)
    total_msgs = len(text_df) or 1
    total_caps = sum(s["caps_lock_count"] for s in per_sender.values())
    total_excl = sum(s["exclamation_count"] for s in per_sender.values())
    total_spam = sum(s["spam_bursts"] for s in per_sender.values())
    total_neg = sum(s["negative_msgs_count"] for s in per_sender.values())

    tension_index = min(100, round(
        (total_caps / total_msgs * 200) +
        (total_excl / total_msgs * 150) +
        (total_spam / total_msgs * 100) +
        (total_neg / total_msgs * 100),
        1
    ))

    if tension_index > 60:
        tension_label = "Volkanik 🌋"
    elif tension_index > 35:
        tension_label = "Fırtınalı ⛈️"
    elif tension_index > 15:
        tension_label = "Rüzgarlı 💨"
    else:
        tension_label = "Sakin Deniz 🌊"

    # Şampiyonlar
    caps_lock_king = max(per_sender, key=lambda s: per_sender[s]["caps_lock_count"]) if per_sender and sum(s["caps_lock_count"] for s in per_sender.values()) > 0 else "Yok"
    exclamation_champion = max(per_sender, key=lambda s: per_sender[s]["exclamation_count"]) if per_sender and sum(s["exclamation_count"] for s in per_sender.values()) > 0 else "Yok"

    # Highlighted Quote for argument
    highlighted_quote = []
    
    if caps_lock_king != "Yok":
        loud_msgs = text_df[
            (text_df["sender"] == caps_lock_king) & 
            (text_df["message"].apply(_is_aggressive_caps))
        ]
        
        top_loud_indices = loud_msgs.index[:3]
        for idx in top_loud_indices:
            pos = df.index.get_loc(idx)
            start = max(0, pos - 1)
            end = min(len(df), pos + 2)
            dialogue = []
            for _, row in df.iloc[start:end].iterrows():
                if row["is_media"]:
                    dialogue.append({"sender": row["sender"], "message": "[Medya]"})
                else:
                    dialogue.append({"sender": row["sender"], "message": row["message"]})
            highlighted_quote.append(dialogue)
    elif total_neg > 0:
        if not pipeline_api and "fallback_neg_score" in text_df.columns:
            toxic_msgs = text_df[text_df["fallback_neg_score"] > 0]
        elif pipeline_api and "valid_df" in locals() and "ml_sentiment" in valid_df.columns:
            toxic_msgs = valid_df[valid_df["ml_sentiment"] == "negative"]
        else:
            messages = text_df["message"].astype(str).str.lower()
            neg_mask = messages.apply(lambda x: any(kw in x for kw in NEGATIVE_KEYWORDS))
            toxic_msgs = text_df[neg_mask]
            
        if not toxic_msgs.empty:
            top_toxic_indices = toxic_msgs.index[:3]
            for idx in top_toxic_indices:
                pos = df.index.get_loc(idx)
                start = max(0, pos - 1)
                end = min(len(df), pos + 2)
                dialogue = []
                for _, row in df.iloc[start:end].iterrows():
                    if row["is_media"]:
                        dialogue.append({"sender": row["sender"], "message": "[Medya]"})
                    else:
                        dialogue.append({"sender": row["sender"], "message": row["message"]})
                highlighted_quote.append(dialogue)

    return {
        "tension_index": tension_index,
        "tension_label": tension_label,
        "caps_lock_king": caps_lock_king,
        "exclamation_champion": exclamation_champion,
        "total_spam_bursts": total_spam,
        "highlighted_quote": highlighted_quote,
        "per_sender": per_sender,
    }


def analyze_apology(df: pd.DataFrame) -> dict:
    """
    Özür Analizi — Kim daha çok özür diler, barış ister?
    """
    text_df = df[~df["is_media"]].copy()
    senders = text_df["sender"].unique()

    # Uzun olanların kısa olanları kapsayıp çift sayılmaması için uzunluğa göre sıralayalım
    sorted_phrases = sorted(PEACE_PHRASES, key=len, reverse=True)

    per_sender = {}
    for sender in senders:
        s_df = text_df[text_df["sender"] == sender]
        # Mesajları tek tek kontrol etmek daha sağlıklı (overlapping engellemek için)
        messages = s_df["message"].str.lower().tolist()

        peace_count = 0
        phrase_stats = Counter()

        for msg in messages:
            temp_msg = msg
            for phrase in sorted_phrases:
                if phrase in temp_msg:
                    occurrences = temp_msg.count(phrase)
                    peace_count += occurrences
                    phrase_stats[phrase] += occurrences
                    # Sayılan kısmı sil ki alt kelimeler (örn: "özür dilerim") tekrar sayılmasın
                    temp_msg = temp_msg.replace(phrase, " [OK] ")

        per_sender[sender] = {
            "apology_count": peace_count,
            "top_phrases": [{"phrase": p, "count": c} for p, c in phrase_stats.most_common(5)],
        }

    # Eğer hiç özür yoksa ambassador "Yok" olsun
    total_apologies = sum(s["apology_count"] for s in per_sender.values())
    if total_apologies == 0:
        ambassador = "Yok"
    else:
        ambassador = max(per_sender, key=lambda s: per_sender[s]["apology_count"])

    return {
        "ambassador": ambassador,
        "total_count": total_apologies,
        "per_sender": per_sender,
    }


# ══════════════════════════════════════════════
#  B. ZAMAN & ALIŞKANLIKLAR
# ══════════════════════════════════════════════

def analyze_streak(df: pd.DataFrame) -> dict:
    """
    Konuşma Streaki — Aralıksız her gün mesajlaşılan en uzun süre.

    Döner: {
        "longest_streak": int (gün),
        "streak_start": str (ISO tarih),
        "streak_end": str (ISO tarih),
        "current_streak": int,
        "total_active_days": int,
        "total_days_span": int,
    }
    """
    dates = sorted(df["date"].unique())
    if len(dates) < 2:
        return {
            "longest_streak": len(dates),
            "streak_start": str(dates[0]) if dates else None,
            "streak_end": str(dates[-1]) if dates else None,
            "current_streak": len(dates),
            "total_active_days": len(dates),
            "total_days_span": 1,
        }

    # En uzun ardışık gün serisi
    longest = 1
    current = 1
    best_start = dates[0]
    best_end = dates[0]
    current_start = dates[0]

    for i in range(1, len(dates)):
        diff = (dates[i] - dates[i - 1]).days
        if diff == 1:
            current += 1
        else:
            if current > longest:
                longest = current
                best_start = current_start
                best_end = dates[i - 1]
            current = 1
            current_start = dates[i]

    # Son seriyi kontrol et
    if current > longest:
        longest = current
        best_start = current_start
        best_end = dates[-1]

    # Mevcut streak (bugüne kadar)
    current_streak = 1
    for i in range(len(dates) - 1, 0, -1):
        if (dates[i] - dates[i - 1]).days == 1:
            current_streak += 1
        else:
            break

    total_span = (dates[-1] - dates[0]).days + 1

    return {
        "longest_streak": longest,
        "streak_start": str(best_start),
        "streak_end": str(best_end),
        "current_streak": current_streak,
        "total_active_days": len(dates),
        "total_days_span": total_span,
        "activity_rate_pct": round(len(dates) / max(total_span, 1) * 100, 1),
    }


def analyze_night_owl(df: pd.DataFrame) -> dict:
    """
    Gece Kuşu vs Erkenci Kuş — Mesajlaşma zaman dağılımı.

    Döner: {
        "night_owl": str,       # 00:00-06:00 en aktif
        "early_bird": str,      # 06:00-10:00 en aktif
        "per_sender": { sender: { night_count, morning_count, ... } },
        "hourly_distribution": [ { hour, count } ]
        "heatmap": { sender: [ 24 saatlik dağılım ] }
    }
    """
    senders = df["sender"].unique()

    # Genel saatlik dağılım
    hourly = df.groupby("hour").size().reindex(range(24), fill_value=0)
    hourly_dist = [{"hour": h, "count": int(c)} for h, c in hourly.items()]

    per_sender = {}
    heatmap = {}

    for sender in senders:
        s_df = df[df["sender"] == sender]
        total = len(s_df) or 1

        night = len(s_df[(s_df["hour"] >= 0) & (s_df["hour"] < 6)])      # 00-06
        morning = len(s_df[(s_df["hour"] >= 6) & (s_df["hour"] < 10)])    # 06-10
        daytime = len(s_df[(s_df["hour"] >= 10) & (s_df["hour"] < 18)])   # 10-18
        evening = len(s_df[(s_df["hour"] >= 18) & (s_df["hour"] < 24)])   # 18-24

        per_sender[sender] = {
            "night_count": int(night),
            "night_pct": round(night / total * 100, 1),
            "morning_count": int(morning),
            "morning_pct": round(morning / total * 100, 1),
            "daytime_count": int(daytime),
            "daytime_pct": round(daytime / total * 100, 1),
            "evening_count": int(evening),
            "evening_pct": round(evening / total * 100, 1),
            "peak_hour": int(s_df["hour"].mode().iloc[0]) if len(s_df) > 0 else 0,
        }

        # Kişi bazlı 24 saatlik heatmap
        s_hourly = s_df.groupby("hour").size().reindex(range(24), fill_value=0)
        heatmap[sender] = [int(v) for v in s_hourly.values]

    # Gece kuşu = gece en çok mesaj atan
    night_owl = max(per_sender, key=lambda s: per_sender[s]["night_count"])
    early_bird = max(per_sender, key=lambda s: per_sender[s]["morning_count"])

    return {
        "night_owl": night_owl,
        "early_bird": early_bird,
        "per_sender": per_sender,
        "hourly_distribution": hourly_dist,
        "heatmap": heatmap,
    }


def analyze_response_times(df: pd.DataFrame) -> dict:
    """
    Görüldü Şampiyonu & Ghosting — Ortalama yanıt süreleri.

    Mantık: Bir kişinin mesajından sonra diğer kişinin ilk mesajına
    kadar geçen süre = yanıt süresi. 6 saatten uzun aralıklar
    "yeni konuşma başlangıcı" sayılır.

    Döner: {
        "fastest_responder": str,
        "slowest_responder": str,
        "per_sender": {
            sender: {
                "avg_response_minutes": float,
                "median_response_minutes": float,
                "fastest_response_seconds": float,
                "ghost_count": int,  # >2 saat yanıtsız
            }
        },
        "fun_fact": str
    }
    """
    MAX_RESPONSE_GAP = timedelta(hours=6)  # 6 saatten uzun = yeni konuşma
    GHOST_THRESHOLD = timedelta(hours=2)   # 2 saatten uzun = ghosting

    senders = df["sender"].unique()
    if len(senders) < 2:
        return {
            "fastest_responder": senders[0] if len(senders) > 0 else "N/A",
            "slowest_responder": senders[0] if len(senders) > 0 else "N/A",
            "per_sender": {},
            "fun_fact": "Tek kişilik sohbet tespit edildi 😅",
        }

    # Yanıt sürelerini hesapla
    response_times = {sender: [] for sender in senders}
    ghost_counts = {sender: 0 for sender in senders}

    sorted_df = df.sort_values("datetime").reset_index(drop=True)

    # Vectorized hesaplama: önceki mesajın sender ve datetime'ını shift ile al
    senders_arr = sorted_df["sender"].values
    times_arr = sorted_df["datetime"].values

    for i in range(1, len(sorted_df)):
        if senders_arr[i] != senders_arr[i - 1]:
            gap = (times_arr[i] - times_arr[i - 1]) / pd.Timedelta(seconds=1)

            # 6 saatten uzun = yeni konuşma, atla
            if gap > MAX_RESPONSE_GAP.total_seconds():
                continue

            responder = senders_arr[i]
            response_times[responder].append(gap)

            if gap > GHOST_THRESHOLD.total_seconds():
                ghost_counts[responder] += 1

    # İstatistikler
    per_sender = {}
    for sender in senders:
        times = response_times[sender]
        if times:
            avg_sec = sum(times) / len(times)
            sorted_times = sorted(times)
            median_sec = sorted_times[len(sorted_times) // 2]
            fastest_sec = min(times)
        else:
            avg_sec = 0
            median_sec = 0
            fastest_sec = 0

        per_sender[sender] = {
            "avg_response_minutes": round(avg_sec / 60, 1),
            "median_response_minutes": round(median_sec / 60, 1),
            "fastest_response_seconds": round(fastest_sec, 1),
            "ghost_count": ghost_counts[sender],
            "total_responses": len(times),
        }

    # Şampiyonlar (0 yanıt olanları hariç tut)
    responders = {s: d for s, d in per_sender.items() if d["total_responses"] > 0}

    if responders:
        fastest = min(responders, key=lambda s: responders[s]["avg_response_minutes"])
        slowest = max(responders, key=lambda s: responders[s]["avg_response_minutes"])
    else:
        fastest = senders[0]
        slowest = senders[-1] if len(senders) > 1 else senders[0]

    fast_mins = per_sender[fastest]["avg_response_minutes"]
    slow_mins = per_sender[slowest]["avg_response_minutes"]

    fun_fact = (
        f"{fastest} ortalama {fast_mins:.0f} dakikada cevap verirken, "
        f"{slowest} {slow_mins:.0f} dakika bekletiyor! 😤"
    )

    return {
        "fastest_responder": fastest,
        "slowest_responder": slowest,
        "per_sender": per_sender,
        "fun_fact": fun_fact,
    }


# ══════════════════════════════════════════════
#  C. KELİME & İFADE TARZI
# ══════════════════════════════════════════════

def analyze_message_style(df: pd.DataFrame) -> dict:
    """
    Roman Yazarı vs Telgrafçı — Mesaj uzunlukları ve stiller.

    Döner: {
        "novelist": str,       # En uzun ortalama mesaj
        "telegraphist": str,   # En kısa ortalama mesaj
        "per_sender": { sender: { avg_words, avg_chars, max_msg_length, one_word_pct } }
    }
    """
    text_df = df[~df["is_media"]].copy()
    senders = text_df["sender"].unique()

    per_sender = {}
    for sender in senders:
        s_df = text_df[text_df["sender"] == sender]
        total = len(s_df) or 1

        avg_words = round(s_df["word_count"].mean(), 1)
        avg_chars = round(s_df["char_count"].mean(), 1)
        max_length = int(s_df["word_count"].max()) if len(s_df) > 0 else 0

        # "ok", "tm", "aynen" gibi tek kelimelik mesaj oranı
        one_word = len(s_df[s_df["word_count"] <= 1])
        one_word_pct = round(one_word / total * 100, 1)

        # En uzun mesaj
        if len(s_df) > 0:
            longest_msg_row = s_df.loc[s_df["word_count"].idxmax()]
            longest_msg = str(longest_msg_row["message"])[:200]  # İlk 200 karakter
        else:
            longest_msg = ""

        per_sender[sender] = {
            "avg_words": avg_words,
            "avg_chars": avg_chars,
            "max_msg_words": max_length,
            "one_word_pct": one_word_pct,
            "total_words": int(s_df["word_count"].sum()),
            "total_messages": total,
            "longest_message_preview": longest_msg,
        }

    novelist = max(per_sender, key=lambda s: per_sender[s]["avg_words"])
    telegraphist = min(per_sender, key=lambda s: per_sender[s]["avg_words"])

    # Highlighted quote
    highlighted_quote = []
    if novelist != "Yok":
        # Grab the top 3 longest messages from the novelist
        novelist_msgs = text_df[text_df["sender"] == novelist].copy()
        if not novelist_msgs.empty:
            top_nov_indices = novelist_msgs["word_count"].nlargest(3).index
            
            for idx in top_nov_indices:
                pos = df.index.get_loc(idx)
                start = max(0, pos - 1)
                end = min(len(df), pos + 2)
                dialogue = []
                for _, row in df.iloc[start:end].iterrows():
                    if row["is_media"]:
                        dialogue.append({"sender": row["sender"], "message": "[Medya]"})
                    else:
                        # Truncate text logic moved to Frontend CSS for better expansion support
                        dialogue.append({"sender": row["sender"], "message": row["message"]})
                highlighted_quote.append(dialogue)

    return {
        "novelist": novelist,
        "telegraphist": telegraphist,
        "highlighted_quote": highlighted_quote,
        "per_sender": per_sender,
    }


def analyze_emoji_universe(df: pd.DataFrame) -> dict:
    """
    Emoji Evreni — Kişi bazlı en çok kullanılan emojiler.

    Döner: {
        "total_emojis": int,
        "emoji_champion": str,
        "per_sender": {
            sender: {
                "total": int,
                "top_3": [ { "emoji": "❤️", "count": 42 }, ... ],
                "emoji_per_message": float,
            }
        },
        "combined_top_10": [ { "emoji": "❤️", "count": 84 }, ... ]
    }
    """
    senders = df["sender"].unique()
    combined_counter = Counter()

    per_sender = {}
    for sender in senders:
        s_df = df[df["sender"] == sender]
        all_emojis = []
        for msg in s_df["message"]:
            all_emojis.extend(_extract_emojis(str(msg)))

        counter = Counter(all_emojis)
        combined_counter.update(counter)

        total = len(all_emojis)
        total_msgs = len(s_df) or 1
        top3 = [{"emoji": e, "count": c} for e, c in counter.most_common(3)]

        per_sender[sender] = {
            "total": total,
            "top_3": top3,
            "emoji_per_message": round(total / total_msgs, 2),
        }

    total_emojis = sum(s["total"] for s in per_sender.values())
    emoji_champion = max(per_sender, key=lambda s: per_sender[s]["total"])
    combined_top_10 = [{"emoji": e, "count": c} for e, c in combined_counter.most_common(10)]

    # Sıradaşı / Nadir Emojiler (En az kullanılanlar arasından 3 tane rastgele)
    import random
    rare_candidates = [e for e, c in combined_counter.items() if c <= 2]
    if not rare_candidates:
        # Eğer herkes çok kullanmışsa en az kullanan 10 taneden seç
        tail = combined_counter.most_common()[-10:]
        rare_candidates = [e for e, c in tail]
    
    rare_emojis = random.sample(rare_candidates, min(3, len(rare_candidates))) if rare_candidates else []

    return {
        "total_emojis": total_emojis,
        "emoji_champion": emoji_champion,
        "per_sender": per_sender,
        "combined_top_10": combined_top_10,
        "rare_emojis": rare_emojis
    }


def analyze_word_cloud(df: pd.DataFrame, top_n: int = 50) -> dict:
    """
    Favori Kelimeler — Bağlaçlar çıkarılmış kişiye özel kelime bulutu.

    Döner: {
        "per_sender": {
            sender: [ { "word": "...", "count": int }, ... ]
        },
        "combined": [ { "word": "...", "count": int }, ... ]
    }
    """
    text_df = df[~df["is_media"]].copy()
    senders = text_df["sender"].unique()

    combined_counter = Counter()
    per_sender = {}

    for sender in senders:
        s_df = text_df[text_df["sender"] == sender]
        all_text = " ".join(s_df["message"].str.lower())

        # Kelimelere ayır, sadece 3+ karakter, alfanumerik
        words = re.findall(r"\b[a-zçğıöşüA-ZÇĞİÖŞÜ]{3,}\b", all_text.lower())

        # Stopwords filtrele
        filtered = [w for w in words if w not in TURKISH_STOPWORDS]

        counter = Counter(filtered)
        combined_counter.update(counter)

        per_sender[sender] = [
            {"word": w, "count": c} for w, c in counter.most_common(top_n)
        ]

    combined = [{"word": w, "count": c} for w, c in combined_counter.most_common(top_n)]

    return {
        "per_sender": per_sender,
        "combined": combined,
    }


# ══════════════════════════════════════════════
#  GENEL İSTATİSTİKLER
# ══════════════════════════════════════════════

def analyze_general_stats(df: pd.DataFrame) -> dict:
    """Genel sohbet istatistikleri."""
    senders = df["sender"].unique().tolist()
    text_df = df[~df["is_media"]]

    total_messages = len(df)
    total_words = int(text_df["word_count"].sum())
    total_chars = int(text_df["char_count"].sum())
    media_count = int(df["is_media"].sum())

    # Kişi bazlı
    per_sender = {}
    for sender in senders:
        s_df = df[df["sender"] == sender]
        per_sender[sender] = {
            "message_count": len(s_df),
            "message_pct": round(len(s_df) / max(total_messages, 1) * 100, 1),
            "word_count": int(s_df[~s_df["is_media"]]["word_count"].sum()),
            "media_count": int(s_df["is_media"].sum()),
        }

    # Tarih aralığı
    date_start = df["datetime"].min()
    date_end = df["datetime"].max()
    days_span = (date_end - date_start).days + 1

    # En aktif gün
    daily = df.groupby("date").size()
    busiest_date = str(daily.idxmax())
    busiest_count = int(daily.max())
    
    # En yoğun günden rastgele 3 mesajlık bir konuşma kesiti al
    busiest_dialogues = []
    busy_df = text_df[text_df["date"] == busiest_date]
    if not busy_df.empty:
        idx = busy_df.index[len(busy_df) // 2]  # Ortasından bir dilim
        pos = df.index.get_loc(idx)
        start = max(0, pos - 1)
        end = min(len(df), pos + 2)
        dialogue = []
        for _, row in df.iloc[start:end].iterrows():
            if row["is_media"]:
                dialogue.append({"sender": row["sender"], "message": "[Medya]"})
            else:
                dialogue.append({"sender": row["sender"], "message": row["message"]})
        busiest_dialogues.append(dialogue)

    # En aktif saat
    hourly = df.groupby("hour").size()
    peak_hour = int(hourly.idxmax())

    # En aktif gün ismi (Pazartesi=0)
    day_names_tr = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"]
    daily_dow = df.groupby("day_of_week").size()
    peak_day = day_names_tr[int(daily_dow.idxmax())]

    # Kitap karşılaştırması (ortalama kitap ~250 sayfa, sayfa başına ~250 kelime)
    book_pages = round(total_words / 250, 0)

    # Tahmini süre (Kelime başı 0.5sn, medya başı 3sn)
    total_seconds = (total_words * 0.5) + (media_count * 3.0)
    chat_hours = int(total_seconds // 3600)
    chat_minutes = int((total_seconds % 3600) // 60)

    return {
        "total_messages": total_messages,
        "total_words": total_words,
        "total_chars": total_chars,
        "media_count": media_count,
        "senders": senders,
        "per_sender": per_sender,
        "date_range": {
            "start": date_start.isoformat(),
            "end": date_end.isoformat(),
            "days_span": days_span,
        },
        "busiest_day": {
            "date": busiest_date,
            "count": busiest_count,
        },
        "peak_hour": peak_hour,
        "peak_day_name": peak_day,
        "book_equivalent_pages": int(book_pages),
        "daily_average": round(total_messages / max(days_span, 1), 1),
        "estimated_chat_time": {
            "hours": chat_hours,
            "minutes": chat_minutes
        }
    }


# ══════════════════════════════════════════════
#  D. DAVRANIŞSAL ALIŞKANLIKLAR & YENİ METRİKLER
# ══════════════════════════════════════════════

def analyze_routines_and_initiators(df: pd.DataFrame) -> dict:
    """
    İlk Sohbet Başlatıcı, Güne Başlama ve Günü Bitirme metrikleri.
    """
    senders = df["sender"].unique().tolist()
    if len(senders) == 0:
        return {}
    
    sorted_df = df.sort_values("datetime").reset_index(drop=True)
    times_arr = sorted_df["datetime"].values
    senders_arr = sorted_df["sender"].values
    hours_arr = sorted_df["hour"].values
    
    initiations = {s: 0 for s in senders}
    morning_starts = {s: 0 for s in senders}
    night_closes = {s: 0 for s in senders}
    
    GAP_THRESHOLD = pd.Timedelta(hours=8).total_seconds()
    
    for i in range(1, len(sorted_df)):
        gap = (times_arr[i] - times_arr[i - 1]) / pd.Timedelta(seconds=1)
        
        if gap > GAP_THRESHOLD:
            # i is the start of a new conversation
            starter = senders_arr[i]
            initiations[starter] += 1
            
            # check morning
            hr = hours_arr[i]
            if 5 <= hr < 12:
                morning_starts[starter] += 1
                
            # i-1 was the end of the previous conversation
            closer = senders_arr[i-1]
            close_hr = hours_arr[i-1]
            if close_hr >= 22 or close_hr < 4:
                night_closes[closer] += 1
                
    icebreaker = max(initiations, key=initiations.get) if initiations else senders[0]
    morning_sun = max(morning_starts, key=morning_starts.get) if morning_starts else senders[0]
    night_owl_closer = max(night_closes, key=night_closes.get) if night_closes else senders[0]

    return {
        "icebreaker": icebreaker,
        "morning_sun": morning_sun,
        "night_owl_closer": night_owl_closer,
        "initiations": initiations,
        "morning_starts": morning_starts,
        "night_closes": night_closes,
    }


def analyze_word_quirks(df: pd.DataFrame) -> dict:
    """
    Kelimeleri Uzatma (Esnek Kelimeler), Random Gülüşler ve Meraklı Kedi (Soru İşaretleri).
    """
    text_df = df[~df["is_media"]].copy()
    senders = text_df["sender"].unique().tolist()
    if len(senders) == 0:
        return {}
    
    per_sender = {}
    
    elongated_re = re.compile(r"([a-zğüşıöçA-Z])\1{3,}", re.IGNORECASE)
    laugh_re = re.compile(r"\b(ha|he|hi|ho){2,}\b|\b([js]{3,})\b|(\b(asdf)\w*)", re.IGNORECASE)
    
    # Kapsamlı Soru Dedektörü (Soru işareti + Soru kelimeleri + Soru ekleri)
    question_re = re.compile(
        r"\b(neden|niye|niçin|nasıl|hangi|nerede|nerde|nereye|nerden|kim|kimin|kimden|naber|napıyorsun|napıyon|naptın)\b|"
        r"\b(mi|mı|mu|mü|misin|mısın|musun|müsün|miyiz|mıyız|muyuz|müyüz|miyim|mıyım|muyum|müyüm)\b|\?",
        re.IGNORECASE
    )
    
    for sender in senders:
        s_df = text_df[text_df["sender"] == sender]
        
        elongated_count = 0
        laugh_count = 0
        question_count = 0
        longest_elongated = ""
        
        for msg in s_df["message"]:
            s_msg = str(msg)
            
            # Soru sayımı
            if question_re.search(s_msg):
                question_count += 1
                
            if laugh_re.search(s_msg):
                laugh_count += 1
            
            words = s_msg.split()
            for w in words:
                if elongated_re.search(w) and len(w) <= 50:
                    elongated_count += 1
                    if len(w) > len(longest_elongated):
                        longest_elongated = w
                        
        per_sender[sender] = {
            "elongated_count": elongated_count,
            "laugh_count": laugh_count,
            "question_count": question_count,
            "longest_elongated": longest_elongated
        }
        
    elastic_king = max(per_sender, key=lambda s: per_sender[s]["elongated_count"]) if senders else "N/A"
    laugh_king = max(per_sender, key=lambda s: per_sender[s]["laugh_count"]) if senders else "N/A"
    question_king = max(per_sender, key=lambda s: per_sender[s]["question_count"]) if senders else "N/A"
    
    # Extract examples for question king (FBI)
    fbi_dialogues = []
    if question_king != "N/A":
        # Soru Regex'i ile o kişiye ait soruları çekiyoruz (Punctuation olmayanları da yakalar)
        q_msgs = text_df[(text_df["sender"] == question_king) & (text_df["message"].apply(lambda x: bool(question_re.search(str(x)))))]
        if not q_msgs.empty:
            # Get up to 15 questions to create an intensive "interrogation" rapid-fire effect
            num_questions = min(15, len(q_msgs))
            sampled_qs = q_msgs.sample(num_questions)
            
            # Create a single mock 'dialogue' composed entirely of these isolated questions
            rapid_fire_questions = []
            for _, row in sampled_qs.iterrows():
                rapid_fire_questions.append({"sender": row["sender"], "message": row["message"]})
                
            fbi_dialogues.append(rapid_fire_questions)
    
    return {
        "elastic_king": elastic_king,
        "laugh_king": laugh_king,
        "question_king": question_king,
        "fbi_dialogues": fbi_dialogues,
        "per_sender": per_sender
    }


# ══════════════════════════════════════════════
#  KÜFÜR ANALİZİ
# ══════════════════════════════════════════════

# Türkçe küfür / argo sözlüğü (yaygın kullanımlar)
PROFANITY_WORDS = [
    "amk", "aq", "mk", "amına", "amınakoyim", "amınakoyayım", "amk",
    "siktir", "siktirgit", "sikeyim", "sikerim", "siktiğim", "siktiğimin",
    "piç", "orospu", "oç", "oc", "orosbuçocuğu", "orospuçocuğu",
    "yarak", "yarrak", "taşak", "taşşak", "göt", "götünü",
    "bok", "boktan", "sik", "am",
    "pezevenk", "kodumun", "kahpe", "ibne", "gavat",
    "hassiktir", "hssktr", "hay amk", "lan amk", "ulan",
    "sg", "s.g", "s2m", "s2ş", "skrm", "amcık","s2k","buramcık","alpipi",
    "yarram","yarrağım","amınakoim","amkmetal","amkm"
]

# Daha gevşek regex pattern'leri (kısaltma varyasyonları)
_PROFANITY_PATTERNS = None

def _get_profanity_patterns():
    global _PROFANITY_PATTERNS
    if _PROFANITY_PATTERNS is None:
        _PROFANITY_PATTERNS = [
            re.compile(r"\b" + re.escape(w) + r"\b", re.IGNORECASE)
            for w in PROFANITY_WORDS
        ]
        # Ek pattern'ler (varyasyonlar)
        _PROFANITY_PATTERNS.extend([
            re.compile(r"\bam[ıi]na?\b", re.IGNORECASE),
            re.compile(r"\bsik\w{0,6}\b", re.IGNORECASE),
            re.compile(r"\borospu\w*\b", re.IGNORECASE),
            re.compile(r"\bpiç\w*\b", re.IGNORECASE),
        ])
    return _PROFANITY_PATTERNS


def analyze_profanity(df: pd.DataFrame) -> dict:
    """
    Küfür Analizi — Kişi bazlı küfür kullanım oranı.

    Döner: {
        "profanity_champion": str,
        "total_profanity": int,
        "profanity_density_label": str,  # "Her X kelimeden 1'i küfür"
        "per_sender": {
            sender: {
                "profanity_count": int,
                "total_words": int,
                "profanity_rate": float,  # Her 100 kelimede kaç küfür
                "density_label": str,
                "top_profanities": [ { "word": str, "count": int } ]
            }
        }
    }
    """
    text_df = df[~df["is_media"]].copy()
    senders = text_df["sender"].unique()
    patterns = _get_profanity_patterns()

    per_sender = {}
    total_profanity = 0

    FALSE_POSITIVES = {
        "sıkıntı", "sikinti", "sıkıntılı", "sikintili", "sıkıldım", "sikildim", 
        "sıkma", "sikma", "sıkıcı", "sikici", "amin", "sık", "sıkı", "sıkıca", 
        "siki", "sikica", "sıkıntıdan", "sikintidan", "sıkılır", "sikilir", 
        "sıkıldı", "sikildi"
    }

    for sender in senders:
        s_df = text_df[text_df["sender"] == sender]
        total_words = int(s_df["word_count"].sum()) or 1
        profanity_counter = Counter()
        profanity_count = 0

        all_text = " ".join(s_df["message"].str.lower())

        for p in patterns:
            matches = p.findall(all_text)
            if matches:
                for match in matches:
                    m_lower = match.lower()
                    if m_lower in FALSE_POSITIVES:
                        continue
                    if m_lower.startswith(("sıkın", "sikin", "sıkıl", "sikil", "sıkıc", "sikic", "sıkıy", "sikiy", "sıkm", "sikm", "sıkışt", "sikist", "sıkça", "sikca", "sıkı", "siki")):
                        # Eğer direkt "sik" veya "sikiş" vs ise küfür olabilir, ama "siki" ile başlayan masum kelimeler çok az.
                        # "sik" -> 3 harf. "siki" -> 4 harf. "sikinti" -> 7 harf.
                        # We allow exact "sik" to pass since startswith("siki") needs at least 4 letters.
                        if m_lower in ["sik", "sikiş", "sikişmek", "sikmek", "sikik"]:
                            pass # let it count
                        else:
                            continue
                    
                    profanity_count += 1
                    profanity_counter[m_lower] += 1

        total_profanity += profanity_count

        # Her 100 kelimede kaç küfür
        rate_per_100 = round(profanity_count / total_words * 100, 1)

        # İnsan okunur label
        if profanity_count == 0:
            density_label = "Tertemiz ✨"
        elif rate_per_100 < 0.5:
            density_label = "Nadiren 🤫"
        elif rate_per_100 < 2:
            density_label = "Ara sıra 😅"
        elif rate_per_100 < 5:
            density_label = "Sık sık 🤬"
        else:
            density_label = "Ağız sabunlanmalı 🧼"

        top_profanities = []
        for w, c in profanity_counter.most_common(5):
            word_len = len(w)
            censored = w
            if word_len >= 4:
                # Censor middle 2 letters
                mid = word_len // 2
                censored = w[:mid-1] + '**' + w[mid+1:]
            elif word_len == 3:
                censored = w[0] + '*' + w[2]
            else:
                censored = w[0] + '*' * (word_len - 1)
            
            top_profanities.append({"word": censored, "count": c})

        per_sender[sender] = {
            "profanity_count": profanity_count,
            "total_words": total_words,
            "profanity_rate": rate_per_100,
            "density_label": density_label,
            "top_profanities": top_profanities,
        }

    # Şampiyon
    profanity_champion = max(
        per_sender, key=lambda s: per_sender[s]["profanity_count"]
    ) if per_sender else "Yok"

    # Genel density label
    total_words_all = sum(s["total_words"] for s in per_sender.values()) or 1
    overall_rate = round(total_profanity / total_words_all * 100, 1)

    if total_profanity == 0:
        overall_density = "Bu sohbette küfür yok, ne kadar kibar insanlarsınız! ✨"
    else:
        words_per_profanity = int(total_words_all / max(total_profanity, 1))
        overall_density = f"Her {words_per_profanity} kelimeden 1'i küfür 🤭"

    return {
        "profanity_champion": profanity_champion,
        "total_profanity": total_profanity,
        "overall_rate_per_100": overall_rate,
        "profanity_density_label": overall_density,
        "per_sender": per_sender,
    }


# ══════════════════════════════════════════════
#  ZAMAN SERİSİ VERİLERİ (Grafikler için)
# ══════════════════════════════════════════════

def analyze_timeline(df: pd.DataFrame) -> dict:
    """
    Zaman serisi verileri — Aylık ve günlük mesaj yoğunluğu.
    Frontend grafikleri için hazır veri.
    """
    # Aylık dağılım
    df_copy = df.copy()
    df_copy["year_month"] = df_copy["datetime"].dt.to_period("M").astype(str)
    monthly = df_copy.groupby("year_month").size().reset_index(name="count")
    monthly_data = [{"month": r["year_month"], "count": int(r["count"])} for _, r in monthly.iterrows()]

    # Haftalık dağılım (gün adı bazlı)
    day_names_tr = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
    dow_data = df.groupby("day_of_week").size().reindex(range(7), fill_value=0)
    weekly_data = [{"day": day_names_tr[i], "count": int(c)} for i, c in dow_data.items()]

    # Saatlik ısı haritası (gün x saat)
    heatmap = df.groupby(["day_of_week", "hour"]).size().unstack(fill_value=0)
    heatmap_data = []
    for dow in range(7):
        for hour in range(24):
            count = int(heatmap.loc[dow, hour]) if dow in heatmap.index and hour in heatmap.columns else 0
            heatmap_data.append({
                "day": day_names_tr[dow],
                "hour": hour,
                "count": count,
            })

    return {
        "monthly": monthly_data,
        "weekly": weekly_data,
        "heatmap": heatmap_data,
    }


def analyze_group_dynamics(df: pd.DataFrame) -> dict:
    """
    Grup Sohbet Analizi — Grup üyeleri arasındaki dinamikler ve ödüller.
    """
    senders = df["sender"].unique()
    is_group = len(senders) > 2
    
    if not is_group:
        return {"is_group": False}

    # 1. Mesaj Sayıları & Liderlik Tablosu
    msg_counts = df["sender"].value_counts()
    leaderboard = []
    for name, count in msg_counts.head(10).items():
        leaderboard.append({"name": name, "count": int(count)})

    # 2. Ödüller (Awards)
    awards = {}

    # A. Ağzı Var Dili Yok (En az konuşan)
    least_talkative = msg_counts.idxmin()
    awards["quiet_one"] = {
        "name": least_talkative,
        "title": "Ağzı Var Dili Yok",
        "desc": "Grupta varlığıyla yokluğu bir, sessiz sakin bir arkadaşımız.",
        "count": int(msg_counts.min())
    }

    # B. Sticker Canavarı
    sticker_df = df[df["is_media"]]
    if not sticker_df.empty:
        sticker_counts = sticker_df["sender"].value_counts()
        monster = sticker_counts.idxmax()
        awards["sticker_monster"] = {
            "name": monster,
            "title": "Sticker Canavarı",
            "desc": "Kelimeler yetmeyince stickerlara sarılan grubun görsel sanatçısı.",
            "count": int(sticker_counts.max())
        }

    # C. Görülmedi Kralı (Ghosted King)
    # Mesajından sonra en az 3 saat sessizlik olan mesajların sahibi
    df_sorted = df.sort_values("datetime")
    df_sorted["next_gap"] = df_sorted["datetime"].shift(-1) - df_sorted["datetime"]
    ghost_msgs = df_sorted[df_sorted["next_gap"] > pd.Timedelta(hours=3)]
    if not ghost_msgs.empty:
        ghost_counts = ghost_msgs["sender"].value_counts()
        king = ghost_counts.idxmax()
        awards["ghost_king"] = {
            "name": king,
            "title": "Görülmedi Kralı",
            "desc": "Attığı mesajlar grupta derin bir sessizliğe yol açıyor. Acaba neden?",
            "count": int(ghost_counts.max())
        }

    # D. Grup Sözcüsü (En çok kelime kullanan - toplamda)
    word_counts = df.groupby("sender")["word_count"].sum()
    spokesperson = word_counts.idxmax()
    awards["spokesperson"] = {
        "name": spokesperson,
        "title": "Grup Sözcüsü",
        "desc": "Maşallah, grubu tek başına sırtlayan, her konuda fikri olan kişi.",
        "count": int(word_counts.max())
    }

    # E. Gece Kuşu (Gece 00-06 arası en aktif)
    night_df = df[(df["hour"] >= 0) & (df["hour"] <= 5)]
    if not night_df.empty:
        night_counts = night_df["sender"].value_counts()
        night_owl = night_counts.idxmax()
        awards["night_owl"] = {
            "name": night_owl,
            "title": "Gece Kuşu",
            "desc": "Herkes uyurken o grupta nöbet tutuyor.",
            "count": int(night_counts.max())
        }

    return {
        "is_group": True,
        "leaderboard": leaderboard,
        "awards": awards
    }


# ══════════════════════════════════════════════
#  ANA ANALİZ ORKESTRATÖRÜ
# ══════════════════════════════════════════════

def run_full_analysis(df: pd.DataFrame) -> dict[str, Any]:
    """
    Tüm metrikleri hesaplar ve tek bir JSON-ready dict döner.
    Bu fonksiyon API endpoint'i tarafından çağrılır.
    """
    # Temel analizler
    profanity_res = analyze_profanity(df)
    group_dynamics = analyze_group_dynamics(df)
    
    # Küfürbaz Haydo ödülünü group_dynamics'e ekle
    if group_dynamics.get("is_group") and profanity_res:
        group_dynamics["awards"]["kufurbaz_haydo"] = {
            "name": profanity_res["profanity_champion"],
            "title": "Küfürbaz Haydo",
            "desc": "Ağzı biraz bozuk ama olsun, samimiyetine inanıyoruz.",
            "count": profanity_res["per_sender"].get(profanity_res["profanity_champion"], {}).get("profanity_count", 0)
        }

    return {
        "general": analyze_general_stats(df),
        "vibe_check": analyze_vibe_check(df),
        "argument_score": analyze_argument_score(df),
        "apology_analysis": analyze_apology(df),
        "streak": analyze_streak(df),
        "night_owl": analyze_night_owl(df),
        "response_times": analyze_response_times(df),
        "message_style": analyze_message_style(df),
        "emoji_universe": analyze_emoji_universe(df),
        "word_cloud": analyze_word_cloud(df),
        "timeline": analyze_timeline(df),
        "routines": analyze_routines_and_initiators(df),
        "word_quirks": analyze_word_quirks(df),
        "profanity": profanity_res,
        "group_dynamics": group_dynamics,
    }

