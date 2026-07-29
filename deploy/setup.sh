#!/bin/bash
# ============================================================
# BA Dashboard — Script de instalação no servidor Ubuntu
# Uso: bash setup.sh
# ============================================================
set -e

APP_DIR="/opt/ba-dashboard"
REPO="https://github.com/luan-engelmann/ba-dashboard.git"

echo "========================================"
echo "  BA Dashboard — Setup do Servidor"
echo "========================================"

# ── 1. Dependências do sistema ────────────────
echo "[1/7] Instalando dependências do sistema..."
apt-get update -qq
apt-get install -y -qq nginx python3 python3-pip python3-venv nodejs npm git curl

# Verifica versão do Node (mínimo 18)
NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
    echo "  → Atualizando Node.js para v20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# ── 2. Clonar repositório ─────────────────────
echo "[2/7] Clonando repositório..."
if [ -d "$APP_DIR" ]; then
    echo "  → Diretório existe, atualizando..."
    cd "$APP_DIR" && git pull
else
    git clone "$REPO" "$APP_DIR"
fi

# ── 3. Backend — virtualenv + dependências ────
echo "[3/7] Configurando backend Python..."
cd "$APP_DIR/backend"
python3 -m venv ../venv
../venv/bin/pip install --upgrade pip -q
../venv/bin/pip install -r requirements.txt -q

# Cria pasta de uploads
mkdir -p uploads
chown -R www-data:www-data uploads

# ── 4. Frontend — build ───────────────────────
echo "[4/7] Buildando frontend React..."
cd "$APP_DIR/frontend"
npm ci --silent
npm run build

# ── 5. systemd — serviço do backend ──────────
echo "[5/7] Configurando serviço systemd..."
cp "$APP_DIR/deploy/ba-dashboard.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable ba-dashboard
systemctl restart ba-dashboard

# ── 6. Nginx ──────────────────────────────────
echo "[6/7] Configurando Nginx..."
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/ba-dashboard
ln -sf /etc/nginx/sites-available/ba-dashboard /etc/nginx/sites-enabled/ba-dashboard

# Remove site default se existir
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl restart nginx

# ── 7. Firewall ───────────────────────────────
echo "[7/7] Abrindo porta 8070 no firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 8070/tcp
    echo "  → ufw: porta 8070 liberada"
fi

# ── Status final ──────────────────────────────
echo ""
echo "========================================"
echo "  Deploy concluído com sucesso!"
echo "========================================"
echo ""
echo "  Dashboard: http://200.159.177.242:8070"
echo ""
echo "  Comandos úteis:"
echo "  systemctl status ba-dashboard   # status da API"
echo "  journalctl -u ba-dashboard -f   # logs da API"
echo "  systemctl restart nginx         # reiniciar nginx"
echo ""
