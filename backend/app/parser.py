"""
WhatsApp Chat Parser
====================
Sağlam regex tabanlı parser. Birden fazla WhatsApp dışa aktarma formatını destekler:
  - Türkçe: "1.03.2024 14:32 - Ali: mesaj"
  - İngilizce 12h: "3/1/24, 2:32 PM - Ali: message"
  - İngilizce 24h: "01/03/2024, 14:32 - Ali: message"
  - Köşeli parantezli: "[1.03.2024, 14:32:05] Ali: mesaj"

Sistem mesajları (grup oluşturma, kişi ekleme vb.) otomatik filtrelenir.
"""

import re
from datetime import datetime
from typing import Optional
import pandas as pd


# ──────────────────────────────────────────────
#  Regex Patterns (WhatsApp Formatları)
# ──────────────────────────────────────────────

# WhatsApp dışa aktarma formatları için regex desenleri
# Her pattern bir (tarih_saat, gönderen, mesaj) grubu döner

PATTERNS = [
    # ── Türkçe / Noktalı Format ──
    # "1.03.2024 14:32 - Ali: mesaj"
    # "01.3.2024 14:32 - Ali: mesaj"
    re.compile(
        r"^(\d{1,2}\.\d{1,2}\.\d{2,4})\s(\d{1,2}[.:]\d{2}(?:[.:]\d{2})?)\s-\s([^:]+):\s(.+)",
        re.MULTILINE,
    ),

    # ── Köşeli Parantezli Format ──
    # "[1.03.2024, 14:32:05] Ali: mesaj"
    # "[01/03/2024, 14:32:05] Ali: mesaj"
    re.compile(
        r"^\[(\d{1,2}[./]\d{1,2}[./]\d{2,4}),?\s(\d{1,2}[.:]\d{2}(?:[.:]\d{2})?)\]\s([^:]+):\s(.+)",
        re.MULTILINE,
    ),

    # ── Standart Uluslararası Format (Virgüllü) ──
    # "3/1/24, 2:32 PM - Ali: message"
    # "01/03/2024, 14:32 - Ali: message"
    re.compile(
        r"^(\d{1,2}/\d{1,2}/\d{2,4}),?\s(\d{1,2}[.:]\d{2}(?:[.:]\d{2})?\s?[APMapm]{0,2})\s-\s([^:]+):\s(.+)",
        re.MULTILINE,
    ),

    # ── Tire olmadan sadece virgüllü ──
    # "1.03.2024, 14:32 - Ali: mesaj"
    re.compile(
        r"^(\d{1,2}\.\d{1,2}\.\d{2,4}),?\s(\d{1,2}[.:]\d{2}(?:[.:]\d{2})?)\s-\s([^:]+):\s(.+)",
        re.MULTILINE,
    ),
]


# ──────────────────────────────────────────────
#  Sistem Mesajları Filtreleme
# ──────────────────────────────────────────────

SYSTEM_MESSAGE_PATTERNS = [
    # Türkçe sistem mesajları
    "grubun simge resmini değiştirdi",
    "grubun konusunu değiştirdi",
    "bu gruba ekledi",
    "bu gruptan çıkardı",
    "bu gruptan ayrıldı",
    "grubu oluşturdu",
    "güvenlik kodunuz değişti",
    "bu sohbetteki mesajlar",
    "mesajlar ve aramalar uçtan uca",
    "kişi engellendi",
    "şifreli mesajlaşma",
    "kayıp mesaj",
    "numarasını değiştirdi",
    "grubun açıklamasını değiştirdi",
    "yönetici yaptı",
    "artık yönetici değil",
    "sizi ekledi",
    "gruba katıldı",
    # İngilizce sistem mesajları
    "messages and calls are end-to-end encrypted",
    "created group",
    "added you",
    "changed the subject",
    "changed this group",
    "changed the group",
    "left the group",
    "removed you",
    "was added",
    "security code changed",
    "joined using this group",
    "you were added",
    "changed their phone number",
    "disappeared",
    "turned on disappearing messages",
    "turned off disappearing messages",
]


def _is_system_message(sender: str, message: str) -> bool:
    """Sistem mesajlarını tespit eder."""
    combined = f"{sender}: {message}".lower()
    return any(pattern in combined for pattern in SYSTEM_MESSAGE_PATTERNS)


# ──────────────────────────────────────────────
#  Medya Mesajları Tespiti
# ──────────────────────────────────────────────

MEDIA_PATTERNS = [
    "<medya dahil edilmedi>",
    "<media omitted>",
    "image omitted",
    "video omitted",
    "audio omitted",
    "sticker omitted",
    "document omitted",
    "gif omitted",
    "contact card omitted",
    "görüntü dahil edilmedi",
    "video dahil edilmedi",
    "ses dahil edilmedi",
    "çıkartma dahil edilmedi",
    "belge dahil edilmedi",
]


def _is_media_message(message: str) -> bool:
    """Medya mesajlarını tespit eder."""
    msg_lower = message.strip().lower()
    return any(pattern in msg_lower for pattern in MEDIA_PATTERNS)


# ──────────────────────────────────────────────
#  Tarih-Saat Ayrıştırma
# ──────────────────────────────────────────────

DATE_FORMATS = [
    # Gün.Ay.Yıl (Türkçe)
    "%d.%m.%Y",
    "%d.%m.%y",
    # Gün/Ay/Yıl
    "%d/%m/%Y",
    "%d/%m/%y",
    # Ay/Gün/Yıl (Amerikan)
    "%m/%d/%Y",
    "%m/%d/%y",
]

TIME_FORMATS = [
    "%H:%M",
    "%H.%M",
    "%H:%M:%S",
    "%H.%M.%S",
    "%I:%M %p",
    "%I:%M:%S %p",
    "%I:%M %P",
    "%I:%M:%S %P",
]


def _parse_datetime(date_str: str, time_str: str) -> Optional[datetime]:
    """Tarih ve saati birleştirerek datetime nesnesine dönüştürür."""
    date_str = date_str.strip()
    time_str = time_str.strip()

    for date_fmt in DATE_FORMATS:
        for time_fmt in TIME_FORMATS:
            try:
                combined = f"{date_str} {time_str}"
                fmt = f"{date_fmt} {time_fmt}"
                dt = datetime.strptime(combined, fmt)
                # 2 haneli yılları düzelt (24 -> 2024)
                if dt.year < 100:
                    dt = dt.replace(year=dt.year + 2000)
                return dt
            except ValueError:
                continue
    return None


# ──────────────────────────────────────────────
#  Ana Parser Fonksiyonu
# ──────────────────────────────────────────────

def detect_best_pattern(content: str) -> Optional[re.Pattern]:
    """İçerikteki en uygun regex pattern'ini tespit eder."""
    best_pattern = None
    best_count = 0

    for pattern in PATTERNS:
        matches = pattern.findall(content[:10000])  # İlk 10K karakter yeterli
        if len(matches) > best_count:
            best_count = len(matches)
            best_pattern = pattern

    return best_pattern if best_count >= 3 else None  # En az 3 eşleşme gerekli


def parse_whatsapp_chat(content: str) -> pd.DataFrame:
    """
    WhatsApp sohbet dosyasını parse eder ve DataFrame döner.

    Returns:
        DataFrame columns:
        - datetime: Mesaj tarihi/saati (datetime64)
        - sender: Gönderen kişi adı (str)
        - message: Mesaj içeriği (str)
        - is_media: Medya mesajı mı? (bool)
        - word_count: Kelime sayısı (int)
        - char_count: Karakter sayısı (int)
        - hour: Saat (0-23)
        - day_of_week: Haftanın günü (0=Pazartesi)
        - date: Tarih (date)

    Raises:
        ValueError: Dosya formatı tanınamazsa
    """
    if not content or len(content.strip()) < 10:
        raise ValueError("Dosya boş veya çok kısa. Geçerli bir WhatsApp dışa aktarma dosyası yükleyin.")

    # En uygun pattern'i tespit et
    pattern = detect_best_pattern(content)

    if pattern is None:
        raise ValueError(
            "WhatsApp sohbet formatı tanınamadı. "
            "Lütfen WhatsApp'tan 'Sohbeti dışa aktar' ile oluşturulmuş bir .txt dosyası yükleyin."
        )

    # Tüm eşleşmeleri bul
    matches = pattern.findall(content)

    if len(matches) < 5:
        raise ValueError(
            f"Yalnızca {len(matches)} mesaj bulundu. "
            "Anlamlı bir analiz için en az 50 mesaj gereklidir."
        )

    # Mesajları parse et
    parsed_messages = []
    skipped_system = 0
    skipped_parse = 0

    for match in matches:
        date_str, time_str, sender, message = match
        sender = sender.strip()
        message = message.strip()

        # Sistem mesajlarını filtrele
        if _is_system_message(sender, message):
            skipped_system += 1
            continue

        # Tarih-saat parse et
        dt = _parse_datetime(date_str, time_str)
        if dt is None:
            skipped_parse += 1
            continue

        is_media = _is_media_message(message)

        parsed_messages.append({
            "datetime": dt,
            "sender": sender,
            "message": message,
            "is_media": is_media,
        })

    if len(parsed_messages) < 5:
        raise ValueError(
            f"Filtreleme sonrası yalnızca {len(parsed_messages)} geçerli mesaj kaldı. "
            f"({skipped_system} sistem mesajı, {skipped_parse} parse hatası atlandı.) "
            "Yeterli veri yok."
        )

    # DataFrame oluştur
    df = pd.DataFrame(parsed_messages)
    df["datetime"] = pd.to_datetime(df["datetime"])
    df = df.sort_values("datetime").reset_index(drop=True)

    # Türetilmiş sütunlar
    df["word_count"] = df["message"].apply(lambda m: len(m.split()) if not _is_media_message(m) else 0)
    df["char_count"] = df["message"].apply(lambda m: len(m) if not _is_media_message(m) else 0)
    df["hour"] = df["datetime"].dt.hour
    df["day_of_week"] = df["datetime"].dt.dayofweek  # 0=Monday
    df["date"] = df["datetime"].dt.date

    senders = df["sender"].unique().tolist()
    
    return df


def get_parse_summary(df: pd.DataFrame) -> dict:
    """Parse sonuçlarının özetini döner (debugging ve loglama için)."""
    senders = df["sender"].unique().tolist()
    text_df = df[~df["is_media"]]
    return {
        "total_messages": len(df),
        "senders": senders,
        "sender_count": len(senders),
        "user_count": len(senders),
        "total_words": int(text_df["word_count"].sum()) if not text_df.empty else 0,
        "date_range": {
            "start": df["datetime"].min().isoformat(),
            "end": df["datetime"].max().isoformat(),
        },
        "media_messages": int(df["is_media"].sum()),
        "text_messages": int((~df["is_media"]).sum()),
    }
