from flask import Flask, g, request, session, flash, redirect, url_for, make_response
from flask_cors import CORS
from config import Config
from database_singleton import init_db, close_db

# Importar blueprints
from blueprints.auth import auth_bp
from blueprints.api import api_bp
from blueprints.upload import upload_bp
from blueprints.registros import registros_bp
from blueprints.actividades import actividades_bp
from blueprints.admin import admin_bp
from blueprints.reportes import reportes_bp
from blueprints.procesosAlmacenado import procesos_bp

# Importar el manejador de errores
from utils import capturar_errores_bp, configurar_manejadores_errores, registrar_context_processors, registrar_error_db
import traceback

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.secret_key = Config.SECRET_KEY

    # ✅ CORS GLOBAL - Permite que React se comunique con Flask
    # NOTA: Cuando supports_credentials=True, NO puedes usar origins="*"
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

    # Manejador global OPTIONS para preflight requests
    @app.after_request
    def after_request(response):
        """Asegura que todas las respuestas tengan headers CORS correctos."""
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
        response = make_response()
        origin = request.headers.get('Origin')
        if origin in ["http://localhost:5173", "http://localhost:3000"]:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        response.status_code = 204
        return response

    # Manejadores globales de errores
    @app.errorhandler(404)
    def not_found(error):
        registrar_error_db(
            modulo='app',
            tipo='Advertencia',
            mensaje=f'404 Not Found: {request.url}',
            traceback_str='',
            usuario=session.get('admin', 'Anónimo'),
            ip=request.remote_addr or 'unknown',
            url=request.url,
            metodo=request.method
        )
        if request.is_json:
            return {"error": "Recurso no encontrado"}, 404
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
        if request.is_json:
            return {"error": "Error interno del servidor"}, 500
        flash("Error interno del servidor", "error")
        return redirect(url_for('auth.panel'))

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
