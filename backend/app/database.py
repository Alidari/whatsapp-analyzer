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
    Column, String, Integer, Text, DateTime, create_engine, desc, text
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


class UserQuota(Base):
    """Kullanıcı kota ve limit takibi."""
    __tablename__ = "user_quotas"
    client_id = Column(String(36), primary_key=True, index=True)
    last_scan_date = Column(String(10), nullable=True) # YYYY-MM-DD
    daily_scans_used = Column(Integer, default=0)
    max_scans_today = Column(Integer, default=1)
    lifetime_scans = Column(Integer, default=0)
    is_subscribed = Column(Integer, default=0) # 0 = No, 1 = Yes
    push_token = Column(String(255), nullable=True)  # Expo push notification token
    created_at = Column(DateTime, default=datetime.utcnow)

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
    is_unlocked = Column(Integer, default=0) # 0 = Locked, 1 = Unlocked


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
    """Tabloları oluşturur ve gerekli migrate'leri yapar (startup'ta çağrılır)."""
    engine = _get_engine()
    Base.metadata.create_all(bind=engine)
    
    # Simple migrations
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE analyses ADD COLUMN is_unlocked INTEGER DEFAULT 0"))
        except Exception as e:
            print(f"ℹ️ Migration (is_unlocked) skipped or failed: {e}")
        try:
            conn.execute(text("ALTER TABLE user_quotas ADD COLUMN is_subscribed INTEGER DEFAULT 0"))
        except Exception as e:
            print(f"ℹ️ Migration (is_subscribed) skipped or failed: {e}")
        try:
            conn.execute(text("ALTER TABLE user_quotas ADD COLUMN push_token TEXT"))
        except Exception as e:
            print(f"ℹ️ Migration (push_token) skipped or failed: {e}")
            
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
#  Kota YÖnetimi (Rate Limiting)
# ──────────────────────────────────────────────

def get_admin_stats() -> dict:
    """Admin paneli için istatistikler ve son aktiviteler döner."""
    session = _get_session()
    try:
        total_users = session.query(UserQuota).count()
        total_analyses = session.query(Analysis).count()
        total_unlocked = session.query(Analysis).filter(Analysis.is_unlocked == 1).count()
        
        # Today tracking
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        daily_active_users = session.query(UserQuota).filter(UserQuota.last_scan_date == today_str).count()
        
        # Lifetime usage from quotes
        from sqlalchemy.sql import func
        total_scans_used = session.query(func.sum(UserQuota.lifetime_scans)).scalar() or 0
        
        # Recent analyses (last 5)
        recent_analyses_qs = session.query(Analysis).order_by(desc(Analysis.created_at)).limit(5).all()
        recent_analyses = []
        for a in recent_analyses_qs:
            recent_analyses.append({
                "chat_name": a.chat_name,
                "created_at": a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "",
                "total_messages": a.total_messages,
                "is_unlocked": a.is_unlocked
            })
            
        # Chart data (Last 7 days)
        from datetime import timedelta
        chart_data_dict = {}
        for i in range(6, -1, -1):
            d = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
            chart_data_dict[d] = 0
            
        all_analyses = session.query(Analysis.created_at).all()
        for a in all_analyses:
            if a.created_at:
                d = a.created_at.strftime("%Y-%m-%d")
                if d in chart_data_dict:
                    chart_data_dict[d] += 1
                    
        chart_labels = list(chart_data_dict.keys())
        chart_values = list(chart_data_dict.values())
        
        return {
            "total_users": total_users,
            "total_analyses": total_analyses,
            "total_unlocked": total_unlocked,
            "daily_active_users": daily_active_users,
            "total_scans_used": total_scans_used,
            "recent_analyses": recent_analyses,
            "chart_labels": chart_labels,
            "chart_values": chart_values
        }
    finally:
        session.close()

def _get_or_create_quota(session: Session, client_id: str) -> UserQuota:
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    quota = session.query(UserQuota).filter(UserQuota.client_id == client_id).first()
    
    if not quota:
        quota = UserQuota(client_id=client_id, last_scan_date=today_str)
        session.add(quota)
    else:
        if quota.last_scan_date != today_str:
            quota.last_scan_date = today_str
            quota.daily_scans_used = 0
            quota.max_scans_today = 1 # Reset to default daily limit
    
    return quota

def check_quota(client_id: str) -> bool:
    """Kullanıcının bugünkü limiti dolmuş mu bakar."""
    session = _get_session()
    try:
        quota = _get_or_create_quota(session, client_id)
        session.commit()
        if quota.is_subscribed:
            print(f"DEBUG: Quota for {client_id}: SUBSCRIBED")
            return True
        allowed = quota.daily_scans_used < quota.max_scans_today
        print(f"DEBUG: Quota for {client_id}: {quota.daily_scans_used}/{quota.max_scans_today} used. Allowed: {allowed}")
        return allowed
    finally:
        session.close()

def use_quota(client_id: str):
    """Bir analiz hakkı harcar."""
    session = _get_session()
    try:
        quota = _get_or_create_quota(session, client_id)
        quota.daily_scans_used += 1
        quota.lifetime_scans += 1
        session.commit()
    finally:
        session.close()

def earn_quota(client_id: str):
    """Reklam izlenildiğinde hakkını arttırır."""
    session = _get_session()
    try:
        quota = _get_or_create_quota(session, client_id)
        old_max = quota.max_scans_today
        quota.max_scans_today += 1
        session.commit()
        print(f"DEBUG: Quota for {client_id} INCREASED from {old_max} to {quota.max_scans_today}")
    finally:
        session.close()

def update_subscription(client_id: str, is_subscribed: bool):
    """Kullanıcının abonelik durumunu günceller."""
    session = _get_session()
    try:
        quota = _get_or_create_quota(session, client_id)
        quota.is_subscribed = 1 if is_subscribed else 0
        session.commit()
    finally:
        session.close()


def save_push_token(client_id: str, token: str):
    """Kullanıcının Expo push token'ını kaydeder."""
    session = _get_session()
    try:
        quota = _get_or_create_quota(session, client_id)
        quota.push_token = token
        session.commit()
    finally:
        session.close()


def get_push_token(client_id: str) -> Optional[str]:
    """Kullanıcının push token'ını döner."""
    session = _get_session()
    try:
        quota = session.query(UserQuota).filter(UserQuota.client_id == client_id).first()
        return quota.push_token if quota else None
    finally:
        session.close()

def unlock_history(analysis_id: str, client_id: str) -> bool:
    """Belirli bir eski analizin kilidini reklam izlenildiğinde kalıcı olarak açar."""
    session = _get_session()
    try:
        record = session.query(Analysis).filter(Analysis.id == analysis_id, Analysis.client_id == client_id).first()
        if not record:
            return False
        record.is_unlocked = 1
        session.commit()
        return True
    except Exception:
        session.rollback()
        return False
    finally:
        session.close()

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

        quota = _get_or_create_quota(session, client_id)
        is_sub = bool(quota.is_subscribed)

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
            is_unlocked=1 if is_sub else 0 # Aboneyse direkt açık, değilse kilitli.
        )

        session.add(analysis)
        session.commit()

        # Quota and cleanup limits
        use_quota(client_id)
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
                "is_unlocked": bool(r.is_unlocked),
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

        # Eğer kilitliyse detay verisini gönderme!
        if not record.is_unlocked:
            return {"error": "LOCKED", "id": record.id}

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
            "is_unlocked": True,
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


def delete_user_data(client_id: str) -> bool:
    """Kullanıcının tüm analiz geçmişini ve kota bilgisini siler."""
    session = _get_session()
    try:
        # Analizleri sil
        session.query(Analysis).filter(Analysis.client_id == client_id).delete()
        # Kota bilgisini sil
        session.query(UserQuota).filter(UserQuota.client_id == client_id).delete()
        session.commit()
        return True
    except Exception as e:
        session.rollback()
        print(f"❌ Kullanıcı verisi silme hatası: {e}")
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
