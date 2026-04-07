#!/bin/bash

# ══════════════════════════════════════════════
#  Anatomi — WhatsApp Sohbet Analizi
#  Backend (FastAPI :8000) + Frontend (Vite :5173)
# ══════════════════════════════════════════════

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo -e "\n${CYAN}${BOLD}Sunucular kapatılıyor...${NC}"
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo -e "${GREEN}✅ Temiz çıkış yapıldı.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║     🧬  Anatomi — Başlatılıyor      ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# ── Backend ──
echo -e "${GREEN}▸ Backend başlatılıyor (FastAPI :8000)...${NC}"
cd "$PROJECT_DIR/backend"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# ── Frontend ──
echo -e "${GREEN}▸ Frontend başlatılıyor (Vite :5173)...${NC}"
cd "$PROJECT_DIR/frontend"
npm run dev -- --host &
FRONTEND_PID=$!

sleep 2
echo ""
echo -e "${CYAN}${BOLD}  🚀 Hazır!${NC}"
echo -e "  ${GREEN}Frontend:${NC}  http://localhost:5173"
echo -e "  ${GREEN}Backend:${NC}   http://localhost:8000"
echo -e "  ${GREEN}API Docs:${NC}  http://localhost:8000/docs"
echo ""
echo -e "  ${RED}Durdurmak için Ctrl+C${NC}"
echo ""

wait
