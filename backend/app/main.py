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
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .parser import parse_whatsapp_chat, get_parse_summary
from .analyzer import run_full_analysis
from .database import (
    init_db, save_analysis, get_history, get_analysis_detail,
    delete_analysis, rename_analysis, has_history, compute_chat_hash,
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
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
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

    # ── Dosya Validasyonu ──
    if not file.filename:
        raise HTTPException(status_code=400, detail="Dosya adı bulunamadı.")

    if not file.filename.endswith(".txt") and not file.filename.endswith(".zip"):
        raise HTTPException(
            status_code=400,
            detail="Yalnızca .txt dosyaları kabul edilir. WhatsApp'tan 'Sohbeti dışa aktar' seçeneğini kullanın.",
        )

    # Dosya boyutu kontrolü (50 MB)
    content_bytes = await file.read()
    file_size = len(content_bytes)
    if file_size > 50 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Dosya çok büyük (>50 MB). Lütfen daha küçük bir sohbet dosyası deneyin.",
        )

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
