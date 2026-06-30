import re
import unicodedata
import pandas as pd
from datetime import datetime
from flask import session, make_response, request, flash, redirect, url_for, render_template, jsonify
from functools import wraps
import traceback
import functools
import logging
import sys
import pytz
from database import get_db


# ============================================================
# 1. FUNCIONES DE LIMPIEZA (tuyas, sin cambios)
# ============================================================

def limpiar_columna(col):
    col = col.strip().lower()
    col = unicodedata.normalize("NFKD", col)\
        .encode("ascii", "ignore")\
        .decode("utf-8")
    col = re.sub(r"\s+", "_", col)
    col = re.sub(r"[^\w]", "", col)
    return col

def limpiar_valor_sqlite(valor):
    if pd.isna(valor):
        return ""
    if isinstance(valor, (pd.Timestamp, datetime)):
        return valor.strftime("%Y-%m-%d")
    return str(valor)


# ============================================================
# 2. DECORADORES DE AUTENTICACIÓN (MEJORADOS)
# ============================================================

def solo_superadmin():
    """Verifica si el usuario actual es superadmin (prioridad = 0)."""
    prioridad = session.get("prioridad")
    print(f"[DEBUG solo_superadmin] prioridad={prioridad}, tipo={type(prioridad)}")
    return prioridad == 0

def es_solicitud_api():
    """Detecta si la petición actual es una API call (JSON/AJAX)."""
    return (
        request.is_json or 
        request.headers.get('Accept') == 'application/json' or
        request.headers.get('X-Requested-With') == 'XMLHttpRequest' or
        request.path.startswith('/api/')
    )

def requiere_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "admin" not in session:
            if es_solicitud_api():
                return jsonify({
                    "success": False,
                    "error": "No autenticado. Inicie sesión."
                }), 401
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

def requiere_superadmin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "admin" not in session:
            if es_solicitud_api():
                return jsonify({
                    "success": False,
                    "error": "No autenticado. Inicie sesión."
                }), 401
            return redirect(url_for('auth.login'))

        prioridad = session.get("prioridad")
        if prioridad != 0:
            if es_solicitud_api():
                return jsonify({
                    "success": False,
                    "error": f"No autorizado. Se requiere superadmin (prioridad=0, tienes={prioridad})."
                }), 403
            return "No autorizado - Se requiere ser superadministrador", 403

        return f(*args, **kwargs)
    return decorated_function

def no_cache(view):
    @wraps(view)
    def decorated_function(*args, **kwargs):
        response = make_response(view(*args, **kwargs))
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
        response.headers['Vary'] = '*'
        response.headers['Clear-Site-Data'] = '"cache"'
        return response
    return decorated_function


# ============================================================
# 3. SISTEMA DE REGISTRO DE ERRORES EN DB (mejorado)
# ============================================================

def registrar_error_db(modulo, tipo, mensaje, traceback_str, usuario, ip, url, metodo):
    """Guarda el error en la base de datos. Funciona incluso si la DB falla."""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO errores_sistema 
            (fecha_hora, modulo, tipo, mensaje, traceback, usuario, ip, url, metodo, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
             get_colombia_time().strftime("%Y-%m-%d %H:%M"), 
            modulo,
            tipo,
            mensaje,
            traceback_str,
            usuario,
            ip,
            url,
            metodo,
            'No resuelto'
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        # Si la DB falla, logueamos en consola para no perder el error
        logging.error(f"[CRITICAL] No se pudo guardar error en DB: {e}")
        logging.error(f"Error original: {mensaje}")
        logging.error(f"Traceback: {traceback_str}")


def obtener_info_error():
    """Obtiene información del contexto actual del error."""
    try:
        usuario = session.get('admin', 'Anónimo')
    except:
        usuario = 'Anónimo'

    try:
        ip = request.remote_addr or 'unknown'
        url = request.url
        metodo = request.method
    except:
        ip = 'unknown'
        url = 'unknown'
        metodo = 'unknown'

    return usuario, ip, url, metodo


# ============================================================
# 4. CAPTURADOR GLOBAL DE ERRORES (NUEVO - Captura TODO)
# ============================================================

def manejar_error_global(e, modulo="app", endpoint=None):
    """
    Función central para manejar CUALQUIER error.
    Se usa desde errorhandlers, decoradores, o try/except manual.
    """
    tb_str = traceback.format_exc()
    usuario, ip, url, metodo = obtener_info_error()

    # Registrar en DB
    registrar_error_db(
        modulo=modulo,
        tipo=e.__class__.__name__,
        mensaje=str(e),
        traceback_str=tb_str,
        usuario=usuario,
        ip=ip,
        url=url,
        metodo=metodo
    )

    # Determinar respuesta según el tipo de petición
    es_api = (
        request.is_json or 
        request.headers.get('Accept') == 'application/json' or
        request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    )

    if es_api:
        return jsonify({
            "error": "Error interno del servidor",
            "tipo": e.__class__.__name__,
            "message": str(e) if app.config.get('DEBUG') else "Contacta al administrador"
        }), 500

    # Para peticiones normales: flash + redirect
    flash(f"⚠️ Ocurrió un error: {str(e)}", "error")

    # Intentar redirigir a una página segura
    try:
        if endpoint:
            return redirect(url_for(endpoint))
        return redirect(request.referrer or url_for('auth.panel'))
    except:
        # Si todo falla, mostrar página de error estática
        return render_template("errores/500.html", 
                              error_msg=str(e),
                              tipo=e.__class__.__name__), 500


# ============================================================
# 5. DECORADOR PARA BLUEPRINTS (tu versión mejorada)
# ============================================================

def capturar_errores_bp(blueprint):
    """
    Aplica captura de errores a TODAS las rutas de un blueprint.
    Uso: capturar_errores_bp(mi_blueprint)
    """
    original_route = blueprint.route

    def route_wrapper(rule, **options):
        def decorator(f):
            @functools.wraps(f)
            def wrapped(*args, **kwargs):
                try:
                    return f(*args, **kwargs)
                except Exception as e:
                    return manejar_error_global(e, modulo=blueprint.name)

            return original_route(rule, **options)(wrapped)
        return decorator

    blueprint.route = route_wrapper
    return blueprint


# ============================================================
# 6. DECORADOR INDIVIDUAL PARA FUNCIONES (NUEVO)
# ============================================================

def capturar_errores(f=None, modulo=None, redirect_endpoint=None):
    """
    Decorador para capturar errores en funciones individuales.
    Puede usarse con o sin parámetros.

    Uso:
        @capturar_errores
        def mi_funcion(): ...

        @capturar_errores(modulo="reportes", redirect_endpoint="auth.panel")
        def mi_funcion(): ...
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapped(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                mod = modulo or func.__module__
                return manejar_error_global(e, modulo=mod, endpoint=redirect_endpoint)
        return wrapped

    if f is None:
        return decorator  # Usado con parámetros: @capturar_errores(modulo="x")
    return decorator(f)   # Usado sin parámetros: @capturar_errores


# ============================================================
# 7. CONFIGURAR ERRORHANDLERS GLOBALES EN TU APP (NUEVO)
# ============================================================

def configurar_manejadores_errores(app):
    """
    Configura manejadores de error globales en la aplicación Flask.
    Llama esto en tu app.py después de crear la app.

    Ejemplo:
        from utils import configurar_manejadores_errores
        configurar_manejadores_errores(app)
    """

    @app.errorhandler(400)
    def bad_request(e):
        usuario, ip, url, metodo = obtener_info_error()
        registrar_error_db("app", "BadRequest", str(e), traceback.format_exc(), usuario, ip, url, metodo)
        if request.is_json:
            return jsonify({"error": "Solicitud incorrecta", "message": str(e)}), 400
        return render_template("errores/400.html", error=str(e)), 400

    @app.errorhandler(403)
    def forbidden(e):
        if request.is_json:
            return jsonify({"error": "Acceso denegado"}), 403
        return render_template("errores/403.html"), 403

    @app.errorhandler(404)
    def not_found(e):
        if request.is_json:
            return jsonify({"error": "Recurso no encontrado"}), 404
        return render_template("errores/404.html"), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        if request.is_json:
            return jsonify({"error": "Método no permitido"}), 405
        flash("Método no permitido para esta acción", "warning")
        return redirect(request.referrer or url_for('auth.panel'))

    @app.errorhandler(500)
    def internal_error(e):
        return manejar_error_global(e, modulo="app")

    @app.errorhandler(Exception)
    def catch_all_exception(e):
        """Captura CUALQUIER excepción no manejada por otros handlers."""
        return manejar_error_global(e, modulo="app")

    # Manejar específicamente errores de BuildError (url_for roto)
    try:
        from werkzeug.routing import BuildError
        @app.errorhandler(BuildError)
        def build_error(e):
            return manejar_error_global(e, modulo="routing")
    except ImportError:
        pass

    logging.info("✅ Manejadores de errores configurados correctamente")


# ============================================================
# 8. FUNCIONES AUXILIARES PARA PLANTILLAS (NUEVO)
# ============================================================

def safe_url_for(endpoint, **kwargs):
    """
    Versión segura de url_for que nunca rompe la página.
    Si el endpoint no existe, retorna '#' y registra el error.
    """
    try:
        from flask import url_for
        return url_for(endpoint, **kwargs)
    except Exception as e:
        usuario, ip, url, metodo = obtener_info_error()
        registrar_error_db(
            modulo="template",
            tipo="BuildError",
            mensaje=f"Endpoint no encontrado: {endpoint}",
            traceback_str=traceback.format_exc(),
            usuario=usuario,
            ip=ip,
            url=url,
            metodo=metodo
        )
        return "#"  # Retorna link vacío en lugar de romper


# ============================================================
# 9. CONTEXT PROCESSOR PARA TEMPLATES (NUEVO)
# ============================================================

def registrar_context_processors(app):
    """
    Registra funciones útiles disponibles en todos los templates.
    """
    @app.context_processor
    def utilidades_template():
        return {
            'safe_url_for': safe_url_for  # Usa {{ safe_url_for('endpoint') }} en templates
        }



def get_colombia_time():
    """Obtiene la hora actual en zona horaria de Colombia (UTC-5)."""
    colombia_tz = pytz.timezone('America/Bogota')
    return datetime.now(colombia_tz)

def convert_utc_to_colombia(utc_datetime):
    """Convierte una fecha UTC a hora de Colombia."""
    if utc_datetime is None:
        return None
    colombia_tz = pytz.timezone('America/Bogota')
    if utc_datetime.tzinfo is None:
        utc_datetime = pytz.utc.localize(utc_datetime)
    return utc_datetime.astimezone(colombia_tz)
