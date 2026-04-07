"""
Database Module — Analiz Sonuçları Kalıcı Depolama
====================================================
SQLite + SQLAlchemy (async) ile analiz sonuçlarını saklar.

GÜVENLİK: Orijinal sohbet metinleri ASLA kaydedilmez.
Yalnızca istatistiksel metrikler ve meta veriler saklanır.
"""

import copy
import hashlib
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import (
    Column, String, Integer, Text, DateTime, create_engine, desc
)
from sqlalchemy.orm import declarative_base, Session, sessionmaker

# ──────────────────────────────────────────────
#  Veritabanı Yolu
# ──────────────────────────────────────────────

DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DB_DIR / "anatomi.db"

# ──────────────────────────────────────────────
#  SQLAlchemy Yapılandırması (Sync — BackgroundTask thread'inde çalışır)
# ──────────────────────────────────────────────

Base = declarative_base()


class Analysis(Base):
    """Tamamlanmış bir analiz kaydı."""
    __tablename__ = "analyses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String(36), nullable=False, index=True)
    chat_hash = Column(String(64), nullable=False)
    chat_name = Column(String(255), nullable=True)
    sender_names = Column(Text, nullable=False)       # JSON array
    total_messages = Column(Integer, nullable=False)
    date_range_start = Column(String(32), nullable=True)
    date_range_end = Column(String(32), nullable=True)
    overall_mood = Column(String(50), nullable=True)
    mood_label = Column(String(50), nullable=True)
    metrics_json = Column(Text, nullable=False)        # Sanitized metrics
    analysis_time_seconds = Column(Integer, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# Engine & Session Factory — lazily initialized
_engine = None
_SessionLocal = None

MAX_ANALYSES_PER_USER = 20


def _get_engine():
    global _engine
    if _engine is None:
        DB_DIR.mkdir(parents=True, exist_ok=True)
        _engine = create_engine(
            f"sqlite:///{DB_PATH}",
            connect_args={"check_same_thread": False},
            echo=False,
        )
    return _engine


def _get_session() -> Session:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=_get_engine())
    return _SessionLocal()


def init_db():
    """Tabloları oluşturur (startup'ta çağrılır)."""
    engine = _get_engine()
    Base.metadata.create_all(bind=engine)
    print(f"✅ Veritabanı hazır: {DB_PATH}")


# ──────────────────────────────────────────────
#  Sanitizasyon — Gerçek mesaj metinlerini siler
# ──────────────────────────────────────────────

def sanitize_metrics(metrics: dict) -> dict:
    """
    Analiz sonuçlarından gerçek mesaj metinlerini çıkarır.
    Yalnızca istatistiksel veriler kalır.

    Kaldırılan alanlar:
    - vibe_check.highlighted_quotes
    - argument_score.highlighted_quote
    - message_style.highlighted_quote
    - message_style.per_sender.*.longest_message_preview
    - word_quirks.fbi_dialogues
    """
    safe = copy.deepcopy(metrics)

    # vibe_check → highlighted_quotes
    if "vibe_check" in safe:
        safe["vibe_check"].pop("highlighted_quotes", None)

    # argument_score → highlighted_quote
    if "argument_score" in safe:
        safe["argument_score"].pop("highlighted_quote", None)

    # message_style → highlighted_quote + longest_message_preview
    if "message_style" in safe:
        safe["message_style"].pop("highlighted_quote", None)
        per_sender = safe["message_style"].get("per_sender", {})
        for sender_data in per_sender.values():
            sender_data.pop("longest_message_preview", None)

    # word_quirks → fbi_dialogues
    if "word_quirks" in safe:
        safe["word_quirks"].pop("fbi_dialogues", None)

    # profanity → top_profanities (küfür metinlerini kaldır)
    if "profanity" in safe:
        per_sender = safe["profanity"].get("per_sender", {})
        for sender_data in per_sender.values():
            sender_data.pop("top_profanities", None)

    # general → busiest_day dialogues
    if "general" in safe:
        busiest = safe["general"].get("busiest_day", {})
        busiest.pop("dialogues", None)

    return safe


def compute_chat_hash(content: str) -> str:
    """Sohbet dosyasının SHA-256 hash'ini hesaplar (dosya tanımlama için)."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


# ──────────────────────────────────────────────
#  CRUD İşlemleri
# ──────────────────────────────────────────────

def save_analysis(
    client_id: str,
    chat_hash: str,
    parse_summary: dict,
    metrics: dict,
    analysis_time: float,
    file_size: int = 0,
) -> str:
    """
    Analiz sonucunu veritabanına kaydeder.
    Gerçek mesaj içerikleri sanitize edilerek silinir.

    Returns: analysis_id (UUID)
    """
    session = _get_session()
    try:
        # Sanitize: gerçek mesaj metinlerini çıkar
        safe_metrics = sanitize_metrics(metrics)

        # Sohbet adını otomatik oluştur (katılımcı isimleri)
        senders = parse_summary.get("senders", [])
        auto_name = " & ".join(senders[:4])
        if len(senders) > 4:
            auto_name += f" +{len(senders) - 4}"

        analysis = Analysis(
            id=str(uuid.uuid4()),
            client_id=client_id,
            chat_hash=chat_hash,
            chat_name=auto_name,
            sender_names=json.dumps(senders, ensure_ascii=False),
            total_messages=parse_summary.get("total_messages", 0),
            date_range_start=parse_summary.get("date_range", {}).get("start"),
            date_range_end=parse_summary.get("date_range", {}).get("end"),
            overall_mood=metrics.get("vibe_check", {}).get("overall_mood"),
            mood_label=metrics.get("vibe_check", {}).get("mood_label_tr"),
            metrics_json=json.dumps(safe_metrics, ensure_ascii=False, default=str),
            analysis_time_seconds=int(analysis_time),
            file_size_bytes=file_size,
        )

        session.add(analysis)
        session.commit()

        # Limit: kullanıcı başına en fazla MAX_ANALYSES_PER_USER kayıt
        _enforce_limit(session, client_id)

        return analysis.id
    except Exception as e:
        session.rollback()
        print(f"❌ DB kayıt hatası: {e}")
        raise
    finally:
        session.close()


def _enforce_limit(session: Session, client_id: str):
    """Kullanıcı başına kayıt limitini uygular (en eskiler silinir)."""
    count = session.query(Analysis).filter(
        Analysis.client_id == client_id
    ).count()

    if count > MAX_ANALYSES_PER_USER:
        excess = count - MAX_ANALYSES_PER_USER
        oldest = (
            session.query(Analysis)
            .filter(Analysis.client_id == client_id)
            .order_by(Analysis.created_at.asc())
            .limit(excess)
            .all()
        )
        for record in oldest:
            session.delete(record)
        session.commit()


def get_history(client_id: str) -> list[dict]:
    """
    Kullanıcının geçmiş analizlerini listeler (metrics hariç, sadece meta).
    En yeniden en eskiye sıralanır.
    """
    session = _get_session()
    try:
        records = (
            session.query(Analysis)
            .filter(Analysis.client_id == client_id)
            .order_by(desc(Analysis.created_at))
            .all()
        )

        return [
            {
                "id": r.id,
                "chat_name": r.chat_name,
                "sender_names": json.loads(r.sender_names),
                "total_messages": r.total_messages,
                "date_range_start": r.date_range_start,
                "date_range_end": r.date_range_end,
                "overall_mood": r.overall_mood,
                "mood_label": r.mood_label,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in records
        ]
    finally:
        session.close()


def get_analysis_detail(analysis_id: str, client_id: str) -> Optional[dict]:
    """
    Belirli bir analizin tüm sonuçlarını döner.
    Güvenlik: client_id eşleşmesi zorunlu.
    """
    session = _get_session()
    try:
        record = (
            session.query(Analysis)
            .filter(Analysis.id == analysis_id, Analysis.client_id == client_id)
            .first()
        )

        if not record:
            return None

        return {
            "id": record.id,
            "chat_name": record.chat_name,
            "sender_names": json.loads(record.sender_names),
            "total_messages": record.total_messages,
            "date_range_start": record.date_range_start,
            "date_range_end": record.date_range_end,
            "overall_mood": record.overall_mood,
            "mood_label": record.mood_label,
            "analysis_time_seconds": record.analysis_time_seconds,
            "created_at": record.created_at.isoformat() if record.created_at else None,
            "metrics": json.loads(record.metrics_json),
            "parse_summary": {
                "total_messages": record.total_messages,
                "senders": json.loads(record.sender_names),
                "sender_count": len(json.loads(record.sender_names)),
                "date_range": {
                    "start": record.date_range_start,
                    "end": record.date_range_end,
                },
            },
        }
    finally:
        session.close()


def delete_analysis(analysis_id: str, client_id: str) -> bool:
    """Bir analizi siler. Güvenlik: client_id eşleşmesi zorunlu."""
    session = _get_session()
    try:
        record = (
            session.query(Analysis)
            .filter(Analysis.id == analysis_id, Analysis.client_id == client_id)
            .first()
        )
        if not record:
            return False
        session.delete(record)
        session.commit()
        return True
    except Exception:
        session.rollback()
        return False
    finally:
        session.close()


def rename_analysis(analysis_id: str, client_id: str, new_name: str) -> bool:
    """Bir analizin adını değiştirir. Güvenlik: client_id eşleşmesi zorunlu."""
    session = _get_session()
    try:
        record = (
            session.query(Analysis)
            .filter(Analysis.id == analysis_id, Analysis.client_id == client_id)
            .first()
        )
        if not record:
            return False
        record.chat_name = new_name[:255]
        session.commit()
        return True
    except Exception:
        session.rollback()
        return False
    finally:
        session.close()


def has_history(client_id: str) -> bool:
    """Kullanıcının en az bir geçmiş analizi var mı?"""
    session = _get_session()
    try:
        return (
            session.query(Analysis)
            .filter(Analysis.client_id == client_id)
            .first()
        ) is not None
    finally:
        session.close()
