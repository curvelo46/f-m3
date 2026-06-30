# ============================================================
# F-M3 - Dockerfile para Render (Monolito: Flask + React)
# ============================================================

# ---------- ETAPA 1: Build del Frontend React ----------
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copiar archivos de dependencias primero (para cache de Docker)
COPY frontend/package*.json ./
RUN npm ci

# Copiar todo el frontend y compilar
COPY frontend/ ./
RUN npm run build

# ---------- ETAPA 2: Backend Flask ----------
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema (si necesitas compilación)
RUN apt-get update && apt-get install -y --no-install-recommends     gcc     libpq-dev     && rm -rf /var/lib/apt/lists/*

# Copiar dependencias del backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo el código del backend
COPY backend/ ./

# Copiar el build del frontend a la carpeta static de Flask
# Esto es lo que permite servir React desde Flask
COPY --from=frontend-build /app/frontend/dist ./static/

# Variables de entorno para producción
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PORT=10000

# Exponer el puerto (Render usa el que definas en la variable PORT)
EXPOSE 10000

# Comando de arranque: Gunicorn con 4 workers

CMD   gunicorn --bind 0.0.0.0:${PORT:-10000} --workers 4 --timeout 120 --access-logfile - --error-logfile - "app:create_app()"