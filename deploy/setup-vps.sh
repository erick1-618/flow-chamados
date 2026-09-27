#!/bin/bash
# =====================================================================
# Script de Inicialização da VPS Oracle (Ubuntu / Debian / Oracle Linux)
# Execute na sua VPS com: bash setup-vps.sh
# =====================================================================

set -e

echo "=== 1. Atualizando pacotes do sistema ==="
sudo apt-get update && sudo apt-get upgrade -y

echo "=== 2. Instalando Docker & Docker Compose ==="
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "Docker instalado com sucesso."
fi

echo "=== 3. Criando diretório da aplicação ==="
sudo mkdir -p /opt/flow-chamados
sudo chown -R $USER:$USER /opt/flow-chamados
cd /opt/flow-chamados

echo "=== 4. Preparando Nginx e Certbot (SSL Gratuito) ==="
sudo apt-get install -y nginx certbot python3-certbot-nginx

echo "=== Configuração inicial concluída! ==="
echo "Copie seu docker-compose.yml e .env para /opt/flow-chamados"
