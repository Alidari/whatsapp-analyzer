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
"""

import time
import uuid
import traceback
from typing import Dict

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel

from .parser import parse_whatsapp_chat, get_parse_summary
from .analyzer import run_full_analysis
from .database import (
    init_db, save_analysis, get_history, get_analysis_detail,
    delete_analysis, rename_analysis, has_history, compute_chat_hash,
    check_quota, use_quota, earn_quota, unlock_history, get_admin_stats
)

# ──────────────────────────────────────────────
#  Job Queue (In-Memory)
# ──────────────────────────────────────────────

# jobs dict stores the status of analysis jobs.
# Format: { "job_id": { "status": "processing" | "completed" | "error", "result": dict, "error_detail": str } }
jobs: Dict[str, dict] = {}

# ──────────────────────────────────────────────
#  FastAPI Uygulaması
# ──────────────────────────────────────────────

app = FastAPI(
    title="Anatomi — WhatsApp Sohbet Analizi API",
    description="WhatsApp sohbet geçmişini 'Spotify Wrapped' estetiğinde analiz eden backend.",
    version="2.0.0",
)

# ──────────────────────────────────────────────
#  Startup Event — DB tablolarını oluştur
# ──────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    init_db()

# ──────────────────────────────────────────────
#  CORS Yapılandırması
# ──────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
#  Helper: Client ID Extraction
# ──────────────────────────────────────────────

def _get_client_id(request: Request) -> str:
    """X-Client-ID header'ından client_id alır."""
    client_id = request.headers.get("x-client-id", "").strip()
    if not client_id or len(client_id) > 64:
        raise HTTPException(status_code=400, detail="Geçerli bir X-Client-ID header'ı gerekli.")
    return client_id


# ──────────────────────────────────────────────
#  Pydantic Models
# ──────────────────────────────────────────────

class RenameRequest(BaseModel):
    name: str


# ──────────────────────────────────────────────
#  Background Task Fonksiyonu
# ──────────────────────────────────────────────

def process_analysis_job(job_id: str, content: str, client_id: str, file_size: int):
    start_time = time.time()
    try:
        # Parsing phase
        jobs[job_id]["status"] = "processing_parsing"
        df = parse_whatsapp_chat(content)
        
        # ML Analysis phase
        jobs[job_id]["status"] = "processing_nlp"
        results = run_full_analysis(df)
        
        elapsed = round(time.time() - start_time, 2)
        parse_summary = get_parse_summary(df)

        # DB'ye kaydet (sanitized)
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

        # Save results (in-memory for current session)
        jobs[job_id] = {
            "status": "completed",
            "result": {
                "success": True,
                "analysis_id": analysis_id,
                "analysis_time_seconds": elapsed,
                "parse_summary": parse_summary,
                "metrics": results,
            }
        }
    except ValueError as e:
        jobs[job_id] = {
            "status": "error",
            "error_detail": str(e)
        }
    except Exception as e:
        traceback.print_exc()
        jobs[job_id] = {
            "status": "error",
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
async def analyze_chat(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """
    WhatsApp sohbet dosyasını kabul eder ve arkaplanda isleme alır.
    Kabul edilen format: .txt dosyası (WhatsApp dışa aktarma)
    Dosya boyutu limiti: 50 MB

    Döner: {"job_id": "uuid", "status": "processing"}
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
                # Ilk .txt dosyasini bul
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

    # Job oluştur ve arkaplan işlemine at
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "starting", "result": None, "error_detail": None}
    
    background_tasks.add_task(process_analysis_job, job_id, content, client_id, file_size)

    return JSONResponse(status_code=202, content={
        "success": True,
        "job_id": job_id,
        "status": "processing"
    })


@app.get("/api/status/{job_id}")
async def get_job_status(job_id: str):
    """Belirli bir job id'nin durumunu ve eğer tamamlandıysa sonucunu döner."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Girdiğiniz işlem Kimliği (Job ID) bulunamadı veya süresi dolmuş.")
        
    return JSONResponse(content=jobs[job_id])


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
async def admin_login(pw: str = Form(...)):
    if pw != get_admin_pass():
        raise HTTPException(status_code=403, detail="Invalid password")
    return {"success": True}

@app.get("/api/admin/stats")
async def admin_stats(pw: str = Header(None)):
    if pw != get_admin_pass():
        raise HTTPException(status_code=403, detail="Invalid password")
    return get_admin_stats()

@app.post("/api/admin/change-password")
async def admin_change_password(current_pw: str = Form(...), new_pw: str = Form(...)):
    if current_pw != get_admin_pass():
        raise HTTPException(status_code=403, detail="Eski şifre hatalı.")
    if len(new_pw) < 3:
        raise HTTPException(status_code=400, detail="Yeni şifre çok kısa.")
    set_admin_pass(new_pw)
    return {"success": True}

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
