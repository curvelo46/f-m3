from flask import Flask, g, request, session, flash, redirect, url_for, make_response, send_from_directory
from flask_cors import CORS
import os
import threading
import time
from config import Config
from database_singleton import init_db, close_db

# Importar blueprints
from blueprints.auth import auth_bp
from blueprints.api import api_bp
from blueprints.upload import upload_bp
from blueprints.registros import registros_bp
from blueprints.actividades import actividades_bp
from blueprints.admin import admin_bp, crear_respaldo_base_datos
from blueprints.reportes import reportes_bp
from blueprints.procesosAlmacenado import procesos_bp

# Importar el manejador de errores
from utils import capturar_errores_bp, configurar_manejadores_errores, registrar_context_processors, registrar_error_db
import traceback


def create_app():
    # ============================================================
    # CONFIGURACIÓN DE RUTAS ESTÁTICAS (Frontend React integrado)
    # ============================================================
    # En producción, el build de React se copia a backend/static/
    # En desarrollo, Flask usa la carpeta static por defecto

    static_folder_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')

    app = Flask(__name__, 
                static_folder=static_folder_path,
                static_url_path='')

    app.config.from_object(Config)
    app.secret_key = Config.SECRET_KEY

    # ============================================================
    # CORS - Solo en desarrollo (localhost)
    # En producción con monolito, NO necesitas CORS porque frontend 
    # y backend están en el mismo dominio
    # ============================================================
    if os.environ.get('FLASK_ENV') == 'development':
        CORS(app, 
             origins=["http://localhost:5173", "http://localhost:3000"],
             supports_credentials=True,
             allow_headers=["Content-Type", "Authorization", "Accept"],
             methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
             expose_headers=["Content-Type", "X-Total-Count"])

    # Inicializar base de datos
    init_db()
    app.teardown_appcontext(close_db)

    # Aplicar captura de errores a CADA blueprint
    capturar_errores_bp(auth_bp)
    capturar_errores_bp(upload_bp)
    capturar_errores_bp(registros_bp)
    capturar_errores_bp(reportes_bp)
    capturar_errores_bp(api_bp)
    capturar_errores_bp(procesos_bp)
    capturar_errores_bp(actividades_bp)
    capturar_errores_bp(admin_bp)

    # Registrar blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(registros_bp)
    app.register_blueprint(reportes_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(procesos_bp)
    app.register_blueprint(actividades_bp)
    app.register_blueprint(admin_bp)

    configurar_manejadores_errores(app)
    registrar_context_processors(app)

    # Iniciar el programador de respaldos automáticos en segundo plano
    iniciar_programador_respaldo(app)

    # ============================================================
    # MANEJADORES CORS (solo desarrollo)
    # ============================================================
    @app.after_request
    def after_request(response):
        """Asegura que todas las respuestas tengan headers CORS correctos."""
        if os.environ.get('FLASK_ENV') == 'development':
            origin = request.headers.get('Origin')
            if origin in ["http://localhost:5173", "http://localhost:3000"]:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept'
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        return response

    @app.route("/", methods=["OPTIONS"])
    @app.route("/<path:path>", methods=["OPTIONS"])
    def handle_options(path=None):
        """Responde a las peticiones OPTIONS (preflight) de CORS."""
        if os.environ.get('FLASK_ENV') == 'development':
            response = make_response()
            origin = request.headers.get('Origin')
            if origin in ["http://localhost:5173", "http://localhost:3000"]:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept'
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
            response.status_code = 204
            return response
        return make_response('', 204)

    # ============================================================
    # SERVIR FRONTEND REACT (Single Page Application)
    # ============================================================
    # Estas rutas deben ir DESPUÉS de los blueprints de la API
    # y sirven el build de React para cualquier ruta no-API

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        """Sirve el frontend React en todas las rutas no-API."""
        # Si la ruta comienza con api/, no es del frontend
        if path.startswith('api/'):
            return {"error": "Not found"}, 404

        # Si el archivo existe en static, servirlo directamente
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)

        # Para cualquier otra ruta, servir index.html (React Router)
        index_path = os.path.join(app.static_folder, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(app.static_folder, 'index.html')

        # Si no hay build de React, mostrar mensaje informativo
        return """
        <h1>Backend API - F-M3</h1>
        <p>El frontend no está compilado. Ejecuta <code>npm run build</code> en la carpeta frontend/</p>
        <p>y copia la carpeta <code>dist/</code> a <code>backend/static/</code></p>
        """, 200

    # ============================================================
    # MANEJADORES GLOBALES DE ERRORES
    # ============================================================
    @app.errorhandler(404)
    def not_found(error):
        # Si es una petición API, devolver JSON
        if request.path.startswith('/api/'):
            registrar_error_db(
                modulo='app',
                tipo='Advertencia',
                mensaje=f'404 API Not Found: {request.url}',
                traceback_str='',
                usuario=session.get('admin', 'Anónimo'),
                ip=request.remote_addr or 'unknown',
                url=request.url,
                metodo=request.method
            )
            return {"error": "Recurso no encontrado"}, 404

        # Si es una petición del frontend, dejar que React maneje el 404
        index_path = os.path.join(app.static_folder, 'index.html')
        if os.path.exists(index_path) and not request.path.startswith('/api/'):
            return send_from_directory(app.static_folder, 'index.html')

        # Fallback a redirección
        return redirect(url_for('auth.panel'))

    @app.errorhandler(500)
    def internal_error(error):
        tb_str = traceback.format_exc()
        registrar_error_db(
            modulo='app',
            tipo='Error',
            mensaje=str(error),
            traceback_str=tb_str,
            usuario=session.get('admin', 'Anónimo'),
            ip=request.remote_addr or 'unknown',
            url=request.url,
            metodo=request.method
        )
        if request.is_json or request.path.startswith('/api/'):
            return {"error": "Error interno del servidor"}, 500
        flash("Error interno del servidor", "error")
        return redirect(url_for('auth.panel'))

    return app


def iniciar_programador_respaldo(app):
    """Inicia un hilo en segundo plano que guarda un respaldo automático cada 60 días."""
    def tarea_periodica():
        intervalo = getattr(Config, 'BACKUP_INTERVAL_SECONDS', 60 * 24 * 3600)
        while True:
            time.sleep(intervalo)
            try:
                resultado = crear_respaldo_base_datos()
                app.logger.info(f"Respaldo automático de base de datos completado: {resultado['backup_path']}")
            except Exception as e:
                app.logger.error(f"Error en respaldo automático de base de datos: {e}")

    hilo = threading.Thread(target=tarea_periodica, daemon=True, name='RespaldoAutoThread')
    hilo.start()


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
