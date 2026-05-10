#!/bin/bash
# ═══════════════════════════════════════════════════════
#  Anatomi — Deploy Script (OTA Update & Build)
# ═══════════════════════════════════════════════════════
#
#  Kullanım:
#    ./scripts/deploy.sh update "mesaj"        → OTA güncelleme (preview)
#    ./scripts/deploy.sh update:prod "mesaj"   → OTA güncelleme (production)
#    ./scripts/deploy.sh build                 → APK build (preview)
#    ./scripts/deploy.sh build:prod            → AAB build (production)
#    ./scripts/deploy.sh status                → Son build durumu
#    ./scripts/deploy.sh clean                 → Kirli veriyi temizle
#
# ═══════════════════════════════════════════════════════

set -e

# ── Renkler ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Proje kök dizinine git ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# ── Yardımcı fonksiyonlar ──
info()    { echo -e "${BLUE}ℹ ${NC} $1"; }
success() { echo -e "${GREEN}✅${NC} $1"; }
warn()    { echo -e "${YELLOW}⚠️ ${NC} $1"; }
error()   { echo -e "${RED}❌${NC} $1"; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}═══ $1 ═══${NC}\n"; }

# ── EAS CLI kontrolü ──
check_eas() {
    if ! command -v eas &> /dev/null; then
        if ! npx eas-cli --version &> /dev/null; then
            error "EAS CLI bulunamadı. Kur: npm install -g eas-cli"
        fi
        EAS="npx eas-cli"
    else
        EAS="eas"
    fi
}

# ── Git durumu ──
show_git_status() {
    if git rev-parse --git-dir > /dev/null 2>&1; then
        local changes=$(git status --porcelain 2>/dev/null | wc -l)
        local branch=$(git branch --show-current 2>/dev/null)
        local commit=$(git rev-parse --short HEAD 2>/dev/null)
        info "Git: ${BOLD}$branch${NC} @ ${commit} (${changes} değişiklik)"
    fi
}

# ═══════════════════════════════════════════════════════
#  OTA UPDATE
# ═══════════════════════════════════════════════════════
do_update() {
    local branch="${1:-preview}"
    local message="$2"

    header "OTA Update → $branch"

    if [ -z "$message" ]; then
        error "Mesaj gerekli! Kullanım: ./scripts/deploy.sh update \"değişiklik açıklaması\""
    fi

    check_eas
    show_git_status

    info "Bundle derleniyor ve yükleniyor..."
    echo ""

    $EAS update \
        --branch "$branch" \
        --message "$message" \
        2>&1

    echo ""
    success "OTA güncelleme başarıyla yüklendi!"
    success "Branch: ${BOLD}$branch${NC}"
    success "Mesaj: ${BOLD}$message${NC}"
    echo ""
    info "Uygulamayı kapatıp açtığında güncelleme otomatik inecek."
}

# ═══════════════════════════════════════════════════════
#  APK / AAB BUILD
# ═══════════════════════════════════════════════════════
do_build() {
    local profile="${1:-preview}"

    header "EAS Build → $profile (Android)"

    check_eas
    show_git_status

    # Preview = APK, Production = AAB
    if [ "$profile" = "production" ]; then
        info "Production AAB build başlatılıyor (Google Play için)..."
    else
        info "Preview APK build başlatılıyor..."
    fi

    echo ""

    $EAS build \
        --platform android \
        --profile "$profile" \
        --no-wait \
        2>&1

    echo ""
    success "Build kuyruğa alındı! EAS Dashboard'dan takip edebilirsin."
    info "Build tamamlandığında: ./scripts/deploy.sh status"
}

# ═══════════════════════════════════════════════════════
#  BUILD STATUS
# ═══════════════════════════════════════════════════════
do_status() {
    header "Son Build Durumları"

    check_eas

    $EAS build:list \
        --platform android \
        --limit 3 \
        --non-interactive \
        2>&1

    echo ""

    info "Son OTA güncellemeler:"
    $EAS update:list \
        --limit 5 \
        --non-interactive \
        2>&1 || true
}

# ═══════════════════════════════════════════════════════
#  CLEAN — Production DB'den kirli veriyi temizle
# ═══════════════════════════════════════════════════════
do_clean() {
    header "Kirli Veri Temizliği"

    local DB_PATH="$PROJECT_DIR/../backend/data/anatomi.db"

    if [ -f "$DB_PATH" ]; then
        warn "Lokal DB'den 'unknown-android-id' kayıtları siliniyor..."

        python3 -c "
import sqlite3
conn = sqlite3.connect('$DB_PATH')
c = conn.cursor()
c.execute(\"SELECT COUNT(*) FROM analyses WHERE client_id = 'unknown-android-id'\")
count = c.fetchone()[0]
if count > 0:
    c.execute(\"DELETE FROM analyses WHERE client_id = 'unknown-android-id'\")
    c.execute(\"DELETE FROM user_quotas WHERE client_id = 'unknown-android-id'\")
    conn.commit()
    print(f'  {count} analiz kaydı silindi.')
else:
    print('  Temizlenecek kayıt yok.')
conn.close()
"
        success "Lokal DB temizlendi."
    else
        info "Lokal DB bulunamadı: $DB_PATH"
    fi

    echo ""
    warn "Production sunucuda da temizlik yapman gerekiyor:"
    echo -e "  ${CYAN}ssh sunucu${NC}"
    echo -e "  ${CYAN}sqlite3 /path/to/anatomi.db \"DELETE FROM analyses WHERE client_id = 'unknown-android-id'; DELETE FROM user_quotas WHERE client_id = 'unknown-android-id';\"${NC}"
}

# ═══════════════════════════════════════════════════════
#  HELP
# ═══════════════════════════════════════════════════════
show_help() {
    echo -e "${BOLD}${CYAN}"
    echo "  ╔═══════════════════════════════════════════════════╗"
    echo "  ║          Anatomi — Deploy Script                  ║"
    echo "  ╚═══════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo -e "  ${BOLD}OTA Güncellemeler (APK build gerektirmez):${NC}"
    echo -e "    ${GREEN}./scripts/deploy.sh update \"mesaj\"${NC}        Preview'a OTA update"
    echo -e "    ${GREEN}./scripts/deploy.sh update:prod \"mesaj\"${NC}   Production'a OTA update"
    echo ""
    echo -e "  ${BOLD}Native Build (native modül değişikliklerinde):${NC}"
    echo -e "    ${GREEN}./scripts/deploy.sh build${NC}                 Preview APK build"
    echo -e "    ${GREEN}./scripts/deploy.sh build:prod${NC}            Production AAB build"
    echo ""
    echo -e "  ${BOLD}Diğer:${NC}"
    echo -e "    ${GREEN}./scripts/deploy.sh status${NC}                Build/update durumları"
    echo -e "    ${GREEN}./scripts/deploy.sh clean${NC}                 unknown-android-id temizliği"
    echo ""
    echo -e "  ${YELLOW}💡 İpucu:${NC} JS/CSS değişikliklerinde ${BOLD}update${NC} yeter."
    echo -e "           Native paket ekle/çıkar yaparsan ${BOLD}build${NC} gerekir."
    echo ""
}

# ═══════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════
case "${1:-help}" in
    update)
        do_update "preview" "$2"
        ;;
    update:prod|update:production)
        do_update "production" "$2"
        ;;
    build)
        do_build "preview"
        ;;
    build:prod|build:production)
        do_build "production"
        ;;
    status)
        do_status
        ;;
    clean)
        do_clean
        ;;
    help|--help|-h|*)
        show_help
        ;;
esac
