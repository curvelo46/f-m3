"""
================================================================================
STORED PROCEDURES → API REST PARA REACT
================================================================================
Este archivo expone las funciones de base de datos como endpoints JSON.
================================================================================
"""
from flask import Blueprint, request, jsonify
from database import get_db

procesos_bp = Blueprint('procesos', __name__, url_prefix='/api/procesos')

# ============================================================
# ACTIVIDADES
# ============================================================

@procesos_bp.route("/actividades", methods=["GET"])
def obtener_actividades():
    """Obtiene actividades filtradas por área o todas."""
    area = request.args.get("area")

    conn = get_db()
    cursor = conn.cursor()

    try:
        if area:
            cursor.execute("""
                SELECT * FROM actividades 
                WHERE area = ? 
                ORDER BY nombre
            """, (area,))
        else:
            cursor.execute("""
                SELECT * FROM actividades 
                ORDER BY area, nombre
            """)
        actividades = [dict(row) for row in cursor.fetchall()]
        return jsonify({"success": True, "actividades": actividades})
    finally:
        conn.close()


@procesos_bp.route("/actividades", methods=["POST"])
def crear_actividad():
    """Crea una nueva actividad."""
    data = request.get_json() or request.form
    area = data.get("area")
    nombre = data.get("nombre")

    if not area or not nombre:
        return jsonify({
            "success": False,
            "error": "Área y nombre son requeridos"
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO actividades(area, nombre) 
            VALUES (?, ?)
        """, (area, nombre))
        conn.commit()
        return jsonify({
            "success": True,
            "id": cursor.lastrowid,
            "message": "Actividad creada correctamente"
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()


@procesos_bp.route("/actividades/<int:id>", methods=["DELETE"])
def eliminar_actividad(id):
    """Elimina una actividad por ID."""
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id FROM actividades WHERE id = ?", (id,))
        if not cursor.fetchone():
            return jsonify({
                "success": False,
                "error": "Actividad no encontrada"
            }), 404

        cursor.execute("DELETE FROM actividades WHERE id = ?", (id,))
        conn.commit()
        return jsonify({
            "success": True,
            "message": "Actividad eliminada correctamente"
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()


# ============================================================
# CAMPOS DINÁMICOS
# ============================================================

@procesos_bp.route("/campos-dinamicos", methods=["GET"])
def obtener_campos_dinamicos():
    """Obtiene todos los campos dinámicos o filtra por actividad/tipo."""
    actividad = request.args.get("actividad")
    tipo = request.args.get("tipo")

    conn = get_db()
    cursor = conn.cursor()

    try:
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
        return jsonify({"success": True, "campos": campos})
    finally:
        conn.close()


@procesos_bp.route("/campos-dinamicos", methods=["POST"])
def crear_campo_dinamico():
    """Crea un nuevo campo dinámico."""
    data = request.get_json() or request.form

    area = data.get("area")
    actividad = data.get("actividad")
    nombre_campo = data.get("nombre_campo")
    tipo = data.get("tipo")
    placeholder = data.get("placeholder", "")
    es_obligatorio = data.get("es_obligatorio", 0)
    orden = data.get("orden")

    if not all([area, actividad, nombre_campo, tipo]):
        return jsonify({
            "success": False,
            "error": "Faltan campos requeridos"
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        # Obtener siguiente ID y orden si no se proporciona
        cursor.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM campos_dinamicos")
        id_campo = data.get("id") or cursor.fetchone()[0]

        if orden is None:
            cursor.execute("""
                SELECT COALESCE(MAX(orden), 0) + 1 
                FROM campos_dinamicos 
                WHERE area = ? AND actividad = ?
            """, (area, actividad))
            orden = cursor.fetchone()[0]

        cursor.execute("""
            INSERT INTO campos_dinamicos 
            (id, area, actividad, nombre_campo, tipo, placeholder, es_obligatorio, orden)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (id_campo, area, actividad, nombre_campo, tipo,
              placeholder, es_obligatorio, orden))
        conn.commit()

        return jsonify({
            "success": True,
            "id": id_campo,
            "message": "Campo creado correctamente"
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()


@procesos_bp.route("/campos-dinamicos/<int:id>", methods=["DELETE"])
def eliminar_campo_dinamico(id):
    """Elimina un campo dinámico y sus dependencias."""
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id FROM campos_dinamicos WHERE id = ?", (id,))
        if not cursor.fetchone():
            return jsonify({
                "success": False,
                "error": "Campo no encontrado"
            }), 404

        # Eliminar dependencias primero
        cursor.execute("DELETE FROM combo_opciones WHERE campo_id = ?", (id,))
        cursor.execute("DELETE FROM boton_opciones WHERE campo_id = ?", (id,))
        cursor.execute("DELETE FROM campos_dinamicos WHERE id = ?", (id,))
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Campo eliminado correctamente"
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()


# ============================================================
# COMBO OPCIONES
# ============================================================

@procesos_bp.route("/combo-opciones/<int:campo_id>", methods=["GET"])
def obtener_combo_opciones(campo_id):
    """Obtiene las opciones de un campo combo."""
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT opcion 
            FROM combo_opciones 
            WHERE campo_id = ?
        """, (campo_id,))
        opciones = [row["opcion"] for row in cursor.fetchall()]
        return jsonify({"success": True, "campo_id": campo_id, "opciones": opciones})
    finally:
        conn.close()


@procesos_bp.route("/combo-opciones", methods=["POST"])
def crear_combo_opcion():
    """Crea una opción para un campo combo."""
    data = request.get_json() or request.form
    campo_id = data.get("campo_id")
    opcion = data.get("opcion")

    if not campo_id or not opcion:
        return jsonify({
            "success": False,
            "error": "campo_id y opcion son requeridos"
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO combo_opciones (campo_id, opcion) 
            VALUES (?, ?)
        """, (campo_id, opcion))
        conn.commit()
        return jsonify({
            "success": True,
            "id": cursor.lastrowid,
            "message": "Opción creada correctamente"
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()


@procesos_bp.route("/combo-opciones/<int:campo_id>", methods=["DELETE"])
def eliminar_combo_opcion(campo_id):
    """Elimina una opción de combo."""
    data = request.get_json() or request.form
    opcion = data.get("opcion")

    conn = get_db()
    cursor = conn.cursor()

    try:
        if opcion:
            cursor.execute("""
                DELETE FROM combo_opciones 
                WHERE campo_id = ? AND opcion = ?
            """, (campo_id, opcion))
        else:
            cursor.execute("""
                DELETE FROM combo_opciones 
                WHERE campo_id = ?
            """, (campo_id,))

        conn.commit()
        return jsonify({
            "success": True,
            "message": "Opción(es) eliminada(s) correctamente"
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()


# ============================================================
# BOTONES OPCIONES
# ============================================================

@procesos_bp.route("/boton-opciones/<int:campo_id>", methods=["GET"])
def obtener_boton_opciones(campo_id):
    """Obtiene las opciones de un campo botón."""
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT opcion, color 
            FROM boton_opciones 
            WHERE campo_id = ?
            ORDER BY id
        """, (campo_id,))
        opciones = [dict(row) for row in cursor.fetchall()]
        return jsonify({"success": True, "campo_id": campo_id, "opciones": opciones})
    finally:
        conn.close()


@procesos_bp.route("/boton-opciones", methods=["POST"])
def crear_boton_opcion():
    """Crea una opción para un campo botón."""
    data = request.get_json() or request.form
    campo_id = data.get("campo_id")
    opcion = data.get("opcion")
    color = data.get("color", "#5470c6")

    if not campo_id or not opcion:
        return jsonify({
            "success": False,
            "error": "campo_id y opcion son requeridos"
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO boton_opciones (campo_id, opcion, color)
            VALUES (?, ?, ?)
        """, (campo_id, opcion, color))
        conn.commit()
        return jsonify({
            "success": True,
            "id": cursor.lastrowid,
            "message": "Botón creado correctamente"
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()


@procesos_bp.route("/boton-opciones/<int:campo_id>", methods=["DELETE"])
def eliminar_boton_opcion(campo_id):
    """Elimina opciones de botón."""
    data = request.get_json() or request.form
    opcion = data.get("opcion")

    conn = get_db()
    cursor = conn.cursor()

    try:
        if opcion:
            cursor.execute("""
                DELETE FROM boton_opciones 
                WHERE campo_id = ? AND opcion = ?
            """, (campo_id, opcion))
        else:
            cursor.execute("""
                DELETE FROM boton_opciones 
                WHERE campo_id = ?
            """, (campo_id,))

        conn.commit()
        return jsonify({
            "success": True,
            "message": "Botón(es) eliminado(s) correctamente"
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        conn.close()


# ============================================================
# SESIÓN Y USUARIOS (helpers para auth.py)
# ============================================================

@procesos_bp.route("/sesion", methods=["GET"])
def obtener_sesion():
    """Obtiene la sesión actual de la base de datos."""
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT usuario_id, nombre_usuario 
            FROM sesion_actual 
            WHERE id = 1
        """)
        sesion = cursor.fetchone()
        if sesion:
            return jsonify({
                "success": True,
                "sesion": dict(sesion)
            })
        return jsonify({
            "success": True,
            "sesion": None
        })
    finally:
        conn.close()


@procesos_bp.route("/sesion/completa", methods=["GET"])
def obtener_sesion_completa():
    """Obtiene los datos completos del usuario en sesión."""
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT u.* 
            FROM usuarios u
            INNER JOIN sesion_actual s ON u.id = s.usuario_id
            WHERE s.id = 1
        """)
        usuario = cursor.fetchone()
        if usuario:
            return jsonify({
                "success": True,
                "usuario": dict(usuario)
            })
        return jsonify({
            "success": True,
            "usuario": None
        })
    finally:
        conn.close()


# ============================================================
# AUDITORÍA
# ============================================================

@procesos_bp.route("/auditoria", methods=["GET"])
def obtener_auditoria():
    """Obtiene registros de auditoría."""
    tabla = request.args.get("tabla")
    limite = request.args.get("limite", 100, type=int)

    conn = get_db()
    cursor = conn.cursor()

    try:
        if tabla:
            cursor.execute("""
                SELECT * FROM auditoria_sistema 
                WHERE tabla_afectada = ? 
                ORDER BY fecha_hora DESC 
                LIMIT ?
            """, (tabla, limite))
        else:
            cursor.execute("""
                SELECT * FROM auditoria_sistema 
                ORDER BY fecha_hora DESC 
                LIMIT ?
            """, (limite,))

        datos = [dict(row) for row in cursor.fetchall()]
        return jsonify({
            "success": True,
            "auditoria": datos,
            "total": len(datos)
        })
    finally:
        conn.close()


@procesos_bp.route("/auditoria/estadisticas", methods=["GET"])
def obtener_estadisticas_auditoria():
    """Obtiene estadísticas de auditoría."""
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT 
                tabla_afectada,
                tipo_operacion,
                COUNT(*) as total,
                COUNT(DISTINCT usuario_id) as usuarios_distintos,
                MAX(fecha_hora) as ultima_operacion
            FROM auditoria_sistema
            GROUP BY tabla_afectada, tipo_operacion
            ORDER BY tabla_afectada, tipo_operacion
        """)
        stats = [dict(row) for row in cursor.fetchall()]
        return jsonify({
            "success": True,
            "estadisticas": stats
        })
    finally:
        conn.close()