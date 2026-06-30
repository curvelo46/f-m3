#!/bin/bash
# ============================================================
# Script de arranque para desarrollo local
# ============================================================
# Uso: ./start.sh

set -e

echo "🚀 Iniciando F-M3 en modo desarrollo..."

# Verificar que estamos en la carpeta correcta
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: No se encontraron las carpetas 'backend' y 'frontend'"
    echo "   Asegúrate de ejecutar este script desde la raíz del proyecto"
    exit 1
fi

# Instalar dependencias del backend si no existen
if [ ! -d "backend/venv" ]; then
    echo "📦 Creando entorno virtual del backend..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
else
    echo "✅ Entorno virtual del backend encontrado"
fi

# Instalar dependencias del frontend si no existen
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Instalando dependencias del frontend..."
    cd frontend
    npm install
    cd ..
else
    echo "✅ Dependencias del frontend encontradas"
fi

# Iniciar backend en background
echo "🐍 Iniciando backend Flask..."
cd backend
source venv/bin/activate
export FLASK_ENV=development
export FLASK_DEBUG=1
python app.py &
BACKEND_PID=$!
cd ..

# Iniciar frontend
echo "⚛️  Iniciando frontend React..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Servicios iniciados:"
echo "   Backend:  http://localhost:5000"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Presiona Ctrl+C para detener todos los servicios"

# Esperar y limpiar al salir
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM
wait
