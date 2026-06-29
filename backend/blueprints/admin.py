from flask import Blueprint, request, jsonify, session
from database import get_db
from utils import requiere_admin, solo_superadmin

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# ============================================================
# ACCIONES / DASHBOARD
# ============================================================

@admin_bp.route("/acciones", methods=["GET"])
@requiere_admin
def acciones():
    """Retorna información del panel de administración."""
    return jsonify({
        "success": True,
        "message": "Panel de administración",
        "secciones": [
            {"id": "limpieza", "nombre": "Limpieza de Datos", "descripcion": "Eliminar datos de tablas"},
            {"id": "usuarios", "nombre": "Gestión de Usuarios", "descripcion": "Crear, editar y eliminar usuarios"},
            {"id": "actividades", "nombre": "Configuración de Actividades", "descripcion": "Administrar actividades y campos dinámicos"}
        ]
    })


# ============================================================
# LIMPIEZA DE TABLAS
# ============================================================

@admin_bp.route("/tablas", methods=["GET"])
@requiere_admin
def listar_tablas():
    """Lista las tablas disponibles para limpieza."""
    tablas_permitidas = {
        "estudiantes": "Estudiantes",
        "personal_universidad": "Personal Universidad",
        "registros": "Registros",
        "auditoria_sistema": "Auditoría del Sistema",
        "errores_sistema": "Errores del Sistema"
    }

    # Obtener conteo de registros por tabla
    conn = get_db()
    cursor = conn.cursor()
    tablas_info = []

    for tabla, nombre in tablas_permitidas.items():
        try:
            cursor.execute(f"SELECT COUNT(*) as total FROM {tabla}")
            total = cursor.fetchone()["total"]
        except:
            total = 0

        tablas_info.append({
            "id": tabla,
            "nombre": nombre,
            "registros": total
        })

    conn.close()

    return jsonify({
        "success": True,
        "tablas": tablas_info
    })


@admin_bp.route("/tablas/eliminar", methods=["POST"])
@requiere_admin
def eliminar_tabla():
    """Elimina TODOS los datos de una tabla (solo superadmin)."""

    # Debug: log session info
    print(f"[DEBUG] Session admin: {session.get('admin')}")
    print(f"[DEBUG] Session prioridad: {session.get('prioridad')}")
    print(f"[DEBUG] Session keys: {list(session.keys())}")

    # Check if user is superadmin - more robust check
    prioridad = session.get("prioridad")
    if prioridad is None:
        return jsonify({
            "success": False,
            "error": "No autorizado. Sesión sin prioridad definida."
        }), 403

    if prioridad != 0:
        return jsonify({
            "success": False,
            "error": f"No autorizado. Se requiere ser superadministrador (prioridad=0, tienes={prioridad})."
        }), 403

    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    tabla = data.get("tabla")
    tablas_permitidas = {
        "estudiantes", "personal_universidad", "registros",
        "auditoria_sistema", "errores_sistema"
    }

    if tabla not in tablas_permitidas:
        return jsonify({
            "success": False,
            "error": "Tabla no permitida para limpieza"
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(f"DELETE FROM {tabla}")
        conn.commit()

        # Obtener conteo actual (debería ser 0)
        cursor.execute(f"SELECT COUNT(*) as total FROM {tabla}")
        total = cursor.fetchone()["total"]

        return jsonify({
            "success": True,
            "message": f"Datos eliminados correctamente de {tabla}",
            "tabla": tabla,
            "registros_restantes": total
        })

    except Exception as e:
        conn.rollback()
        return jsonify({
            "success": False,
            "error": f"Error eliminando datos: {str(e)}"
        }), 500

    finally:
        conn.close()


# ============================================================
# ESTADÍSTICAS DE ADMIN
# ============================================================

@admin_bp.route("/stats", methods=["GET"])
@requiere_admin
def stats_admin():
    """Retorna estadísticas generales para el panel de admin."""
    conn = get_db()
    cursor = conn.cursor()

    stats = {}

    # Conteos generales
    cursor.execute("SELECT COUNT(*) as total FROM usuarios")
    stats["total_usuarios"] = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) as total FROM actividades")
    stats["total_actividades"] = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) as total FROM campos_dinamicos")
    stats["total_campos_dinamicos"] = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) as total FROM registros")
    stats["total_registros"] = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) as total FROM estudiantes")
    stats["total_estudiantes"] = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) as total FROM personal_universidad")
    stats["total_personal"] = cursor.fetchone()["total"]

    # Errores no resueltos
    cursor.execute("""
        SELECT COUNT(*) as total 
        FROM errores_sistema 
        WHERE estado = 'No resuelto'
    """)
    stats["errores_pendientes"] = cursor.fetchone()["total"]

    # Última auditoría
    cursor.execute("""
        SELECT fecha_hora, tabla_afectada, tipo_operacion, nombre_usuario
        FROM auditoria_sistema
        ORDER BY fecha_hora DESC
        LIMIT 1
    """)
    ultima_auditoria = cursor.fetchone()
    stats["ultima_auditoria"] = dict(ultima_auditoria) if ultima_auditoria else None

    conn.close()

    return jsonify({
        "success": True,
        "stats": stats
    })
