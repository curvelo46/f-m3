from flask import Blueprint, jsonify, request
from database import get_db

api_bp = Blueprint('api', __name__, url_prefix='/api')

# ============================================================
# DEPENDENCIAS
# ============================================================

@api_bp.route("/dependencias/estudiantes", methods=["GET"])
def api_dependencias_estudiantes():
    """Obtiene planes de estudio únicos de estudiantes."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT plan_estudio 
        FROM estudiantes 
        WHERE plan_estudio IS NOT NULL 
        AND plan_estudio != ''
        ORDER BY plan_estudio
    """)
    planes = [row["plan_estudio"] for row in cursor.fetchall()]
    conn.close()

    return jsonify({
        "success": True,
        "dependencias": planes,
        "tipo": "estudiantes"
    })


@api_bp.route("/dependencias/funcionarios", methods=["GET"])
def api_dependencias_funcionarios():
    """Obtiene unidades organizativas únicas de personal."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT unidad_organizativa 
        FROM personal_universidad 
        WHERE unidad_organizativa IS NOT NULL 
        AND unidad_organizativa != ''
        ORDER BY unidad_organizativa
    """)
    unidades = [row["unidad_organizativa"] for row in cursor.fetchall()]
    conn.close()

    return jsonify({
        "success": True,
        "dependencias": unidades,
        "tipo": "funcionarios"
    })


# ============================================================
# ACTIVIDADES
# ============================================================

@api_bp.route("/actividades", methods=["GET"])
def api_actividades():
    """Obtiene todas las actividades, opcionalmente filtradas por área."""
    area = request.args.get("area")

    conn = get_db()
    cursor = conn.cursor()

    if area:
        cursor.execute("""
            SELECT id, area, nombre 
            FROM actividades 
            WHERE area = ? 
            ORDER BY nombre
        """, (area,))
    else:
        cursor.execute("""
            SELECT id, area, nombre 
            FROM actividades 
            ORDER BY area, nombre
        """)

    actividades = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({
        "success": True,
        "actividades": actividades
    })


@api_bp.route("/actividades/areas", methods=["GET"])
def api_areas():
    """Obtiene las áreas únicas disponibles."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT area 
        FROM actividades 
        WHERE area IS NOT NULL 
        AND area != ''
        ORDER BY area
    """)
    areas = [row["area"] for row in cursor.fetchall()]
    conn.close()

    return jsonify({
        "success": True,
        "areas": areas
    })


# ============================================================
# CAMPOS DINÁMICOS
# ============================================================

@api_bp.route("/campos-dinamicos", methods=["GET"])
def api_campos_dinamicos():
    """Obtiene campos dinámicos, filtrables por actividad o tipo."""
    actividad = request.args.get("actividad")
    tipo = request.args.get("tipo")

    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT id, area, actividad, nombre_campo, tipo, placeholder, 
               es_obligatorio, orden 
        FROM campos_dinamicos 
        WHERE 1=1
    """
    params = []

    if actividad:
        query += " AND actividad = ?"
        params.append(actividad)
    if tipo:
        query += " AND tipo = ?"
        params.append(tipo)

    query += " ORDER BY area, actividad, orden"

    cursor.execute(query, params)
    campos = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({
        "success": True,
        "campos": campos
    })


@api_bp.route("/campos-dinamicos/<int:campo_id>/opciones", methods=["GET"])
def api_opciones_campo(campo_id):
    """Obtiene las opciones de un campo (combo o botones)."""
    conn = get_db()
    cursor = conn.cursor()

    # Verificar tipo de campo
    cursor.execute("SELECT tipo FROM campos_dinamicos WHERE id = ?", (campo_id,))
    campo = cursor.fetchone()

    if not campo:
        conn.close()
        return jsonify({
            "success": False,
            "error": "Campo no encontrado"
        }), 404

    tipo = campo["tipo"]

    if tipo == "combo":
        cursor.execute("""
            SELECT opcion FROM combo_opciones 
            WHERE campo_id = ? 
            ORDER BY id
        """, (campo_id,))
        opciones = [row["opcion"] for row in cursor.fetchall()]

    elif tipo == "grupo_botones":
        cursor.execute("""
            SELECT opcion, color FROM boton_opciones 
            WHERE campo_id = ? 
            ORDER BY id
        """, (campo_id,))
        opciones = [dict(row) for row in cursor.fetchall()]

    else:
        opciones = []

    conn.close()

    return jsonify({
        "success": True,
        "campo_id": campo_id,
        "tipo": tipo,
        "opciones": opciones
    })


# ============================================================
# ESTADÍSTICAS RÁPIDAS
# ============================================================

@api_bp.route("/stats", methods=["GET"])
def api_stats():
    """Retorna estadísticas rápidas del sistema."""
    conn = get_db()
    cursor = conn.cursor()

    stats = {}

    # Contar registros
    cursor.execute("SELECT COUNT(*) as total FROM registros")
    stats["total_registros"] = cursor.fetchone()["total"]

    # Contar estudiantes
    cursor.execute("SELECT COUNT(*) as total FROM estudiantes")
    stats["total_estudiantes"] = cursor.fetchone()["total"]

    # Contar personal
    cursor.execute("SELECT COUNT(*) as total FROM personal_universidad")
    stats["total_personal"] = cursor.fetchone()["total"]

    # Contar usuarios
    cursor.execute("SELECT COUNT(*) as total FROM usuarios")
    stats["total_usuarios"] = cursor.fetchone()["total"]

    # Contar actividades
    cursor.execute("SELECT COUNT(*) as total FROM actividades")
    stats["total_actividades"] = cursor.fetchone()["total"]

    # Últimos registros (hoy)
    from datetime import datetime
    hoy = datetime.now().strftime("%Y-%m-%d")
    cursor.execute("""
        SELECT COUNT(*) as total 
        FROM registros 
        WHERE fecha LIKE ?
    """, (f"{hoy}%",))
    stats["registros_hoy"] = cursor.fetchone()["total"]

    conn.close()

    return jsonify({
        "success": True,
        "stats": stats
    })