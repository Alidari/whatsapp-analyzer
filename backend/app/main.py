"""
WhatsApp Analyzer — FastAPI Backend
====================================
Ana API server. Dosya yükleme endpoint'i ve CORS yapılandırması.

Endpoints:
  POST /api/analyze             — WhatsApp .txt dosyasını yükler, job_id döner
  GET  /api/status/{job}        — Arka plan analizinin sonucunu ve durumunu döner
  GET  /api/health              — Sağlık kontrolü
  GET  /api/history             — Kullanıcının geçmiş analizlerini listeler
  GET  /api/history/{id}        — Belirli analizin detayını döner
  DELETE /api/history/{id}      — Belirli analizi siler
  PATCH /api/history/{id}/rename — Analiz adını değiştirir
  GET  /api/has-history         — Kullanıcının geçmişi var mı kontrol eder
  POST /api/push-token          — Expo push token kaydeder
"""

import asyncio
import time
import uuid
import traceback
from typing import Dict

import httpx
from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel
from google.oauth2 import service_account
from googleapiclient.discovery import build
import os
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .parser import parse_whatsapp_chat, get_parse_summary
from .analyzer import run_full_analysis
from .database import (
    init_db, save_analysis, get_history, get_analysis_detail,
    delete_analysis, rename_analysis, has_history, compute_chat_hash,
    check_quota, use_quota, earn_quota, unlock_history, get_admin_stats,
    update_subscription, _get_or_create_quota, _get_session, delete_user_data,
    save_push_token, get_push_token
)

# ──────────────────────────────────────────────
#  Global Job Store + Async Queue
# ──────────────────────────────────────────────

# jobs dict: { job_id: { status, result, error_detail, client_id, queued_at, position } }
jobs: Dict[str, dict] = {}

# Async iş kuyruğu — startup'ta başlatma sırasında oluşturulacak
_job_queue: asyncio.Queue = None

MAX_WORKERS = 2  # Aynı anda max kaç analiz yapılsın

# ──────────────────────────────────────────────
#  FastAPI Uygulaması
# ──────────────────────────────────────────────

app = FastAPI(
    title="Anatomi — WhatsApp Sohbet Analizi API",
    description="WhatsApp sohbet geçmişini 'Spotify Wrapped' estetiğinde analiz eden backend.",
    version="2.0.0",
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ──────────────────────────────────────────────
#  Startup Event — DB tablolarını oluştur + worker'ları başlat
# ──────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    global _job_queue
    init_db()
    _job_queue = asyncio.Queue()
    # MAX_WORKERS kadar arka plan worker başlat
    for i in range(MAX_WORKERS):
        asyncio.create_task(analysis_worker(f"worker-{i}"))
    print(f"✅ {MAX_WORKERS} analiz worker'i başlatıldı")

# ──────────────────────────────────────────────
#  CORS Yapılandırması
# ──────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://anatomi.app",
        "https://www.anatomi.app",
        "https://anatomi.alidari.dev",
        "https://anatomi-api.alidari.dev",
        "http://localhost:5173",
        "http://localhost:80",
        "http://localhost"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
#  Helper: Client ID Extraction
# ──────────────────────────────────────────────

API_KEY_SECRET = "AnatomiSecureKey2026!"

def check_api_key(request: Request):
    api_key = request.headers.get("x-api-key", "").strip()
    if api_key != API_KEY_SECRET:
        raise HTTPException(status_code=401, detail="Geçersiz veya eksik API Anahtarı.")

def _get_client_id(request: Request) -> str:
    """X-Client-ID header'ından client_id alır."""
    check_api_key(request)
    client_id = request.headers.get("x-client-id", "").strip()
    if not client_id or len(client_id) > 64:
        raise HTTPException(status_code=400, detail="Geçerli bir X-Client-ID header'ı gerekli.")
    return client_id


# ──────────────────────────────────────────────
#  Google Play Verification Helper
# ──────────────────────────────────────────────

SERVICE_ACCOUNT_FILE = os.path.join(os.path.dirname(__file__), "../data/google-service-key.json")
PACKAGE_NAME = "com.anatomi.app"

def verify_google_purchase(token: str, product_id: str) -> bool:
    """
    Google Play Android Developer API kullanarak aboneliği doğrular.
    Çevre değişkeni 'GOOGLE_SERVICE_KEY_JSON' veya yerel diskteki 'backend/data/google-service-key.json' kullanılır.
    """
    scopes = ['https://www.googleapis.com/auth/androidpublisher']
    creds = None

    # 1. Çevre değişkenini kontrol et (Coolify/Docker Production)
    env_json = os.environ.get("GOOGLE_SERVICE_KEY_JSON")
    if env_json:
        try:
            import json
            info = json.loads(env_json)
            creds = service_account.Credentials.from_service_account_info(info, scopes=scopes)
            print("✅ Google Credentials loaded from environment variable.")
        except Exception as env_err:
            print(f"⚠️ Failed to load Google Credentials from environment variable: {env_err}")

    # 2. Disk üzerindeki dosyayı kontrol et (Lokal Geliştirme / Manuel Yükleme)
    if not creds:
        if not os.path.exists(SERVICE_ACCOUNT_FILE):
            print("⚠️ Service account key not found (no env or file). Skipping real verification.")
            return True # Dev mode: always true if key missing
        try:
            creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=scopes)
            print("✅ Google Credentials loaded from file.")
        except Exception as file_err:
            print(f"❌ Failed to load Google Credentials from file: {file_err}")
            return False

    try:
        service = build('androidpublisher', 'v3', credentials=creds)
        
        # Abonelik kontrolü
        result = service.purchases().subscriptions().get(
            packageName=PACKAGE_NAME,
            subscriptionId=product_id,
            token=token
        ).execute()
        
        # Expiry kontrolü
        expiry_time = int(result.get('expiryTimeMillis', 0))
        if expiry_time > int(time.time() * 1000):
            return True
        return False
    except Exception as e:
        print(f"❌ Google Verification Error: {e}")
        return False


# ──────────────────────────────────────────────
#  Pydantic Models
# ──────────────────────────────────────────────

class RenameRequest(BaseModel):
    name: str


# ──────────────────────────────────────────────
#  Expo Push Notification
# ──────────────────────────────────────────────

async def send_push_notification(push_token: str, title: str, body: str, data: dict = None):
    """Expo Push Notification API ile bildirim gönderir."""
    if not push_token or not push_token.startswith("ExponentPushToken"):
        return
    try:
        payload = {
            "to": push_token,
            "title": title,
            "body": body,
            "sound": "default",
            "data": data or {},
            "priority": "high",
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            print(f"🔔 Push notification sent to {push_token[:30]}... -> {resp.status_code}")
    except Exception as e:
        print(f"⚠️ Push notification failed: {e}")


# ──────────────────────────────────────────────
#  Async Queue Worker
# ──────────────────────────────────────────────

def _queue_position(job_id: str) -> int:
    """Kuyruktaki job'un sıra numarasını hesaplar (1-basalı)."""
    queued = [jid for jid, j in jobs.items() if j.get("status") == "queued"]
    try:
        return queued.index(job_id) + 1
    except ValueError:
        return 0


async def analysis_worker(name: str):
    """Sürekli çalışan arka plan worker. Kuyruktan job alır ve işler."""
    print(f"💡 {name} started")
    while True:
        job_id, content, client_id, file_size = await _job_queue.get()
        try:
            await run_analysis_job(job_id, content, client_id, file_size)
        except Exception as e:
            traceback.print_exc()
            jobs[job_id] = {
                "status": "error",
                "client_id": client_id,
                "error_detail": f"Worker hatası: {str(e)}"
            }
        finally:
            _job_queue.task_done()


async def run_analysis_job(job_id: str, content: str, client_id: str, file_size: int):
    """Async analiz işi — thread pool'da çalışır."""
    import concurrent.futures
    loop = asyncio.get_running_loop()
    start_time = time.time()

    try:
        # Parsing phase (thread-pool'da CPU-bound)
        jobs[job_id]["status"] = "processing_parsing"
        df = await loop.run_in_executor(None, parse_whatsapp_chat, content)
        
        # Mesaj sayısını kaydet (tahmin için)
        msg_count = len(df) if not df.empty else 0
        jobs[job_id]["message_count"] = msg_count

        # Grup mu kontrol et
        is_group = df['sender'].nunique() > 2 if not df.empty else False
        jobs[job_id]["is_group"] = is_group

        # ML Analysis phase
        jobs[job_id]["status"] = "processing_nlp"
        results = await loop.run_in_executor(None, run_full_analysis, df)

        elapsed = round(time.time() - start_time, 2)
        parse_summary = get_parse_summary(df)

        # DB'ye kaydet
        chat_hash = compute_chat_hash(content)
        analysis_id = None
        if client_id:
            try:
                analysis_id = save_analysis(
                    client_id=client_id,
                    chat_hash=chat_hash,
                    parse_summary=parse_summary,
                    metrics=results,
                    analysis_time=elapsed,
                    file_size=file_size,
                )
                print(f"✅ Analiz DB'ye kaydedildi: {analysis_id}")
            except Exception as db_err:
                print(f"⚠️ DB kayıt başarısız (analiz yine döner): {db_err}")

        jobs[job_id] = {
            "status": "completed",
            "client_id": client_id,
            "result": {
                "success": True,
                "analysis_id": analysis_id,
                "analysis_time_seconds": elapsed,
                "parse_summary": parse_summary,
                "metrics": results,
            }
        }

        # Push notification gönder
        if client_id:
            push_token = get_push_token(client_id)
            if push_token:
                await send_push_notification(
                    push_token,
                    title="Analiz Tamamlandı! 🎉",
                    body="Sohbet analizi hazır. Sonularınızı görmek için dokunun.",
                    data={"job_id": job_id, "screen": "loading"}
                )

    except ValueError as e:
        jobs[job_id] = {
            "status": "error",
            "client_id": client_id,
            "error_detail": str(e)
        }
    except Exception as e:
        traceback.print_exc()
        jobs[job_id] = {
            "status": "error",
            "client_id": client_id,
            "error_detail": f"Analiz sırasında beklenmeyen bir hata oluştu: {str(e)}"
        }


# ──────────────────────────────────────────────
#  Endpoints — Core
# ──────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    """Sağlık kontrolü — backend çalışıyor mu?"""
    return {"status": "healthy", "service": "anatomi-backend", "version": "2.0.0"}


@app.post("/api/analyze")
@limiter.limit("5/minute")
async def analyze_chat(
    request: Request,
    file: UploadFile = File(...),
):
    """
    WhatsApp sohbet dosyasını kabul eder, kuyruğa alır.
    Kabul edilen format: .txt dosyası (WhatsApp dışa aktarma)
    Dosya boyutu limiti: 50 MB

    Döner: {"job_id": "uuid", "status": "queued", "queue_position": int}
    """
    # ── Client ID ──
    client_id = request.headers.get("x-client-id", "").strip()
    
    if client_id and not check_quota(client_id):
        raise HTTPException(status_code=403, detail="LIMIT_REACHED")

    # ── Dosya Validasyonu ──
    if not file.filename:
        raise HTTPException(status_code=400, detail="Dosya adı bulunamadı.")

    filename_lower = file.filename.lower()
    content_type = (file.content_type or "").lower()
    
    is_text = filename_lower.endswith(".txt") or "text/plain" in content_type
    is_zip = filename_lower.endswith(".zip") or "zip" in content_type or "archive" in content_type

    if not is_text and not is_zip:
        raise HTTPException(
            status_code=400,
            detail="Yalnızca .txt veya .zip formatındaki dosyalar kabul edilir. Lütfen geçerli bir sohbet belgesi yükleyin.",
        )

    # Dosya boyutu kontrolü (50 MB)
    content_bytes = await file.read()
    file_size = len(content_bytes)
    if file_size > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Dosya çok büyük (>50 MB). Lütfen daha küçük bir sohbet dosyası deneyin.",
        )

    # Eger ZIP ise icinden .txt dosyasini bul ve disari cikar
    if is_zip:
        import zipfile
        import io
        try:
            with zipfile.ZipFile(io.BytesIO(content_bytes)) as z:
                txt_filename = next((name for name in z.namelist() if name.endswith(".txt")), None)
                if not txt_filename:
                    raise HTTPException(status_code=400, detail="ZIP dosyasının içinde .txt uzantılı sohbet metni bulunamadı.")
                content_bytes = z.read(txt_filename)
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="Bozuk bir ZIP dosyası yüklediniz.")

    # ── İçerik Decode ──
    try:
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            content = content_bytes.decode("utf-8-sig")  # BOM'lu UTF-8
        except UnicodeDecodeError:
            try:
                content = content_bytes.decode("latin-1")
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail="Dosya karakter kodlaması okunamadı. UTF-8 formatında bir dosya yükleyin.",
                )

    # Job oluştur ve async kuyruğa ekle
    job_id = str(uuid.uuid4())
    queued_count = sum(1 for j in jobs.values() if j.get("status") == "queued")
    queue_position = queued_count + 1

    jobs[job_id] = {
        "status": "queued",
        "client_id": client_id,
        "queue_position": queue_position,
        "queued_at": time.time(),
        "result": None,
        "error_detail": None,
    }
    
    await _job_queue.put((job_id, content, client_id, file_size))

    return JSONResponse(status_code=202, content={
        "success": True,
        "job_id": job_id,
        "status": "queued",
        "queue_position": queue_position,
    })


@app.get("/api/status/{job_id}")
async def get_job_status(job_id: str, request: Request):
    """Belirli bir job id'nin durumunu ve eğer tamamlandıysa sonucunu döner."""
    check_api_key(request)
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Girdiğiniz işlem Kimliği (Job ID) bulunamadı veya süresi dolmuş.")

    job = jobs[job_id]
    status = job.get("status")

    # Kullanıcıya dönük durum mesajları
    STATUS_LABELS = {
        "queued": "🟡 Sırada bekleniyor",
        "processing_parsing": "⏳ Mesajlar okunuyor...",
        "processing_nlp": "🧠 Yapay zeka analiz ediyor...",
        "completed": "✅ Analiz tamamlandı!",
        "error": "❌ Bir hata oluştu",
    }

    q_pos = _queue_position(job_id) if status == "queued" else 0
    
    # Tahmini süre hesabı (Saniye)
    # BERT CPU hızı: ~0.06s per message. 
    # Model yükleme + parse overhead: ~30s
    msg_count = job.get("message_count", 2000) 
    base_process_time = 30 + (msg_count * 0.06)
    
    estimated_seconds = 0
    if status == "queued":
        # Kuyrukta: (Sıra * Ortalama İşleme) / Worker + Mevcut İş
        estimated_seconds = int((q_pos * 120) / 2) + int(base_process_time)
    elif status.startswith("processing"):
        # İşleniyor: Tahmini sürenin %70'i kalmıştır diye varsayalım (NLP en uzun süren kısım)
        estimated_seconds = int(base_process_time * 0.7)

    response = {
        "status": status,
        "status_label": STATUS_LABELS.get(status, status),
        "is_group": job.get("is_group", False),
        "queue_position": q_pos,
        "estimated_seconds": max(estimated_seconds, 15),
        "result": job.get("result"),
        "error_detail": job.get("error_detail"),
    }

    # Kuyrukta ise pozisyonu ekle
    if status == "queued":
        response["queue_position"] = _queue_position(job_id)

    return JSONResponse(content=response)


# ──────────────────────────────────────────────
#  Endpoints — History (Geçmiş Analizler)
# ──────────────────────────────────────────────

@app.get("/api/has-history")
async def check_has_history(request: Request):
    """Kullanıcının en az bir geçmiş analizi olup olmadığını kontrol eder."""
    client_id = request.headers.get("x-client-id", "").strip()
    if not client_id:
        return {"has_history": False}
    return {"has_history": has_history(client_id)}


class PushTokenRequest(BaseModel):
    token: str

@app.post("/api/push-token")
async def register_push_token(body: PushTokenRequest, request: Request):
    """Kullanıcının Expo push token'ını kaydeder. Analiz tamamlanınca bildirim gönderilir."""
    client_id = _get_client_id(request)
    if not body.token or not body.token.startswith("ExponentPushToken"):
        raise HTTPException(status_code=400, detail="Geçersiz push token formatı.")
    save_push_token(client_id, body.token)
    return {"success": True}



import os
import json

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "../data/admin_config.json")

def get_admin_pass() -> str:
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f).get("admin_pass", "admin123")
        except:
            pass
    return "admin123"

def set_admin_pass(new_pass: str):
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump({"admin_pass": new_pass}, f)

from fastapi import Form
from fastapi.responses import RedirectResponse

from fastapi import Header

@app.post("/api/admin/login")
async def admin_login(request: Request, pw: str = Form(...)):
    check_api_key(request)
    if pw != get_admin_pass():
        raise HTTPException(status_code=403, detail="Invalid password")
    return {"success": True}

@app.get("/api/admin/stats")
async def admin_stats(request: Request, pw: str = Header(None)):
    check_api_key(request)
    if pw != get_admin_pass():
        raise HTTPException(status_code=403, detail="Invalid password")
    return get_admin_stats()

@app.post("/api/admin/change-password")
async def admin_change_password(request: Request, current_pw: str = Form(...), new_pw: str = Form(...)):
    check_api_key(request)
    if current_pw != get_admin_pass():
        raise HTTPException(status_code=403, detail="Eski şifre hatalı.")
    if len(new_pw) < 3:
        raise HTTPException(status_code=400, detail="Yeni şifre çok kısa.")
    set_admin_pass(new_pw)
    return {"success": True}


@app.get("/api/admin/active-jobs")
async def admin_active_jobs(request: Request, pw: str = Header(None)):
    """Şu an kuyrukta bekleyen veya işlenen tüm analizleri döner."""
    check_api_key(request)
    if pw != get_admin_pass():
        raise HTTPException(status_code=403, detail="Invalid password")
    
    active_list = []
    now = time.time()
    for jid, job in jobs.items():
        # Sadece son 1 saat içindeki işleri listele veya henüz bitmemiş olanları
        queued_at = job.get("queued_at", 0)
        status = job.get("status")
        if now - queued_at < 3600 or status not in ["completed", "error"]:
            active_list.append({
                "job_id": jid,
                "status": status,
                "client_id": job.get("client_id"),
                "queued_at": queued_at,
                "is_group": job.get("is_group", False),
                "queue_position": _queue_position(jid) if status == "queued" else 0
            })
    
    return {
        "active_jobs": sorted(active_list, key=lambda x: x["queued_at"], reverse=True),
        "queue_size": _job_queue.qsize() if _job_queue else 0,
        "total_in_memory": len(jobs)
    }

TEST_CHATS_DIR = os.path.join(os.path.dirname(__file__), "../data/test_chats")

@app.get("/api/admin/test-chats")
async def admin_get_test_chats(request: Request, pw: str = Header(None)):
    check_api_key(request)
    if pw != get_admin_pass():
        raise HTTPException(status_code=403, detail="Invalid password")
    
    if not os.path.exists(TEST_CHATS_DIR):
        return {"chats": []}
    
    chats = [f for f in os.listdir(TEST_CHATS_DIR) if f.endswith(".txt")]
    return {"chats": chats}

@app.post("/api/admin/analyze-test-chat/{filename}")
async def admin_analyze_test_chat(filename: str, request: Request, pw: str = Header(None)):
    check_api_key(request)
    if pw != get_admin_pass():
        raise HTTPException(status_code=403, detail="Invalid password")
    
    filepath = os.path.join(TEST_CHATS_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Test file not found")
        
    start_time = time.time()
    try:
        with open(filepath, "rb") as f:
            content_bytes = f.read()
            
        try:
            content = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                content = content_bytes.decode("utf-8-sig")
            except UnicodeDecodeError:
                content = content_bytes.decode("latin-1")
                
        df = parse_whatsapp_chat(content)
        results = run_full_analysis(df)
        elapsed = round(time.time() - start_time, 2)
        parse_summary = get_parse_summary(df)
        
        return {
            "success": True,
            "result": {
                "success": True,
                "analysis_id": f"test-{filename}",
                "analysis_time_seconds": elapsed,
                "parse_summary": parse_summary,
                "metrics": results
            }
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import FileResponse
@app.get("/admin")
async def admin_fallback():
    return FileResponse(os.path.join(os.path.dirname(__file__), "../../frontend/dist/index.html"))


@app.post("/api/earn-quota")
async def earn_quota_endpoint(request: Request):
    """Kullanıcı reklam izledikten sonra 1 hak kazanır."""
    client_id = _get_client_id(request)
    earn_quota(client_id)
    return {"success": True, "message": "1 Analiz hakkı eklendi."}


@app.post("/api/unlock-history/{analysis_id}")
async def unlock_history_endpoint(analysis_id: str, request: Request):
    """Geçmişteki kilitli bir analizi reklam izlenince açar."""
    client_id = _get_client_id(request)
    success = unlock_history(analysis_id, client_id)
    if not success:
        raise HTTPException(status_code=404, detail="Analiz bulunamadı veya açılamadı.")
    return {"success": True, "message": "Analiz açıldı."}
    

@app.get("/api/subscription-status")
async def get_subscription_status(request: Request):
    """Kullanıcının abonelik durumunu döner."""
    client_id = _get_client_id(request)
    session = _get_session()
    try:
        quota = _get_or_create_quota(session, client_id)
        return {
            "is_subscribed": bool(quota.is_subscribed),
            "daily_scans_used": quota.daily_scans_used,
            "max_scans_today": quota.max_scans_today
        }
    finally:
        session.close()


class VerifySubRequest(BaseModel):
    purchaseToken: str
    productId: str

@app.post("/api/verify-subscription")
async def verify_subscription(body: VerifySubRequest, request: Request):
    """
    Google Play abonelik doğrulama.
    NOT: Gerçek uygulamada Google Play Developer API ile token doğrulanmalıdır.
    Şimdilik client-side başarılıysa güveniyoruz.
    """
    client_id = _get_client_id(request)
    
    # Real verification
    is_valid = verify_google_purchase(body.purchaseToken, body.productId)
    
    if is_valid:
        update_subscription(client_id, True)
        return {"success": True, "message": "Abonelik başarıyla aktifleştirildi."}
    else:
        raise HTTPException(status_code=400, detail="Abonelik doğrulaması başarısız oldu.")


@app.get("/api/history")
async def list_history(request: Request):
    """Kullanıcının geçmiş analizlerini listeler (metrikler hariç)."""
    client_id = _get_client_id(request)
    history = get_history(client_id)
    return {"success": True, "analyses": history}


@app.get("/api/history/{analysis_id}")
async def get_history_detail(analysis_id: str, request: Request):
    """Belirli bir geçmiş analizin tam sonuçlarını döner."""
    client_id = _get_client_id(request)
    detail = get_analysis_detail(analysis_id, client_id)
    
    if not detail:
        raise HTTPException(status_code=404, detail="Analiz bulunamadı.")
    
    return {
        "success": True,
        "result": {
            "success": True,
            "analysis_id": detail["id"],
            "analysis_time_seconds": detail["analysis_time_seconds"],
            "parse_summary": detail["parse_summary"],
            "metrics": detail["metrics"],
        },
        "meta": {
            "chat_name": detail["chat_name"],
            "created_at": detail["created_at"],
        }
    }


@app.delete("/api/history/{analysis_id}")
async def delete_history(analysis_id: str, request: Request):
    """Kullanıcının bir geçmiş analizini siler."""
    client_id = _get_client_id(request)
    success = delete_analysis(analysis_id, client_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Analiz bulunamadı veya erişim yetkiniz yok.")
    
    return {"success": True, "message": "Analiz silindi."}


@app.patch("/api/history/{analysis_id}/rename")
async def rename_history(analysis_id: str, body: RenameRequest, request: Request):
    """Bir analizin adını değiştirir."""
    client_id = _get_client_id(request)
    
    if not body.name or len(body.name.strip()) < 1:
        raise HTTPException(status_code=400, detail="Geçerli bir isim giriniz.")
    
    success = rename_analysis(analysis_id, client_id, body.name.strip())
    
    if not success:
        raise HTTPException(status_code=404, detail="Analiz bulunamadı veya erişim yetkiniz yok.")
    
    return {"success": True, "message": "İsim güncellendi."}
    
    
@app.delete("/api/user/data")
async def delete_user_data_endpoint(request: Request):
    """Kullanıcının tüm verilerini (geçmiş analizler ve kota bilgisi) siler."""
    client_id = _get_client_id(request)
    success = delete_user_data(client_id)
    if not success:
        raise HTTPException(status_code=500, detail="Veriler silinirken bir hata oluştu.")
    return {"success": True, "message": "Tüm verileriniz başarıyla silindi."}


# ──────────────────────────────────────────────
#  Hata İşleyicileri
# ──────────────────────────────────────────────

@app.exception_handler(422)
async def validation_error_handler(request, exc):
    """Pydantic validation hatalarını kullanıcı dostu mesaja dönüştürür."""
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "detail": "Geçersiz istek. Lütfen geçerli bir .txt dosyası yükleyin.",
        },
    )


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Sunucu hatalarını yakalar."""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "detail": "Sunucu hatası. Lütfen tekrar deneyin veya farklı bir dosya yükleyin.",
        },
    )
