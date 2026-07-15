from flask import Blueprint, request, jsonify
from database import get_db
from utils import requiere_admin

actividades_bp = Blueprint('actividades', __name__, url_prefix='/api/actividades')

# ============================================================
# ACTIVIDADES PRINCIPALES
# ============================================================

@actividades_bp.route("/", methods=["GET"])
def api_actividades():
    """Obtiene todas las actividades agrupadas por área."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, area, nombre FROM actividades ORDER BY nombre")
    rows = cursor.fetchall()
    conn.close()

    resultado = {"centro": [], "sst": []}
    for r in rows:
        area = r["area"]
        if area not in resultado:
            resultado[area] = []
        resultado[area].append({
            "id": r["id"],
            "nombre": r["nombre"]
        })

    return jsonify({
        "success": True,
        "actividades": resultado
    })


@actividades_bp.route("/<area>", methods=["GET"])
def api_actividades_por_area(area):
    """Obtiene actividades filtradas por área."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, area, nombre 
        FROM actividades 
        WHERE area = ? 
        ORDER BY nombre
    """, (area,))
    actividades = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({
        "success": True,
        "area": area,
        "actividades": actividades
    })


@actividades_bp.route("/", methods=["POST"])
@requiere_admin
def agregar_actividad():
    """Crea una nueva actividad."""
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

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
        cursor.execute(
            "INSERT INTO actividades(area, nombre) VALUES (?, ?)",
            (area, nombre)
        )
        conn.commit()

        return jsonify({
            "success": True,
            "id": cursor.lastrowid,
            "message": f"Actividad '{nombre}' agregada correctamente",
            "actividad": {
                "id": cursor.lastrowid,
                "area": area,
                "nombre": nombre
            }
        })

    except Exception as e:
        conn.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        conn.close()


@actividades_bp.route("/<int:id>", methods=["DELETE"])
@requiere_admin
def eliminar_actividad(id):
    """Elimina una actividad por ID."""
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Verificar si existe
        cursor.execute("SELECT id, nombre FROM actividades WHERE id = ?", (id,))
        actividad = cursor.fetchone()

        if not actividad:
            conn.close()
            return jsonify({
                "success": False,
                "error": "Actividad no encontrada"
            }), 404

        nombre = actividad["nombre"]

        # Eliminar
        cursor.execute("DELETE FROM actividades WHERE id = ?", (id,))
        conn.commit()

        return jsonify({
            "success": True,
            "message": f"Actividad '{nombre}' eliminada correctamente",
            "id_eliminado": id
        })

    except Exception as e:
        conn.rollback()
        return jsonify({
            "success": False,
            "error": f"Error del servidor: {str(e)}"
        }), 500

    finally:
        conn.close()


# ============================================================
# ADMIN ACTIVIDADES (CONFIGURACIÓN COMPLETA)
# ============================================================

@actividades_bp.route("/configuracion", methods=["GET"])
@requiere_admin
def admin_actividades():
    """Obtiene toda la configuración de actividades, campos y opciones."""
    area = request.args.get("area")

    conn = get_db()
    cursor = conn.cursor()

    # Actividades
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

    # Campos dinámicos
    cursor.execute("""
        SELECT id, area, actividad, nombre_campo, tipo, placeholder, 
               es_obligatorio, orden 
        FROM campos_dinamicos 
        ORDER BY area, actividad, orden
    """)
    campos = cursor.fetchall()

    # Opciones para combos
    cursor.execute("SELECT campo_id, opcion FROM combo_opciones")
    opciones_raw = cursor.fetchall()

    # Opciones para botones
    cursor.execute("SELECT campo_id, opcion, color FROM boton_opciones")
    boton_opciones_raw = cursor.fetchall()

    conn.close()

    # Organizar campos por tipo
    combos = []
    textos = []
    botones = []

    for campo in campos:
        campo_dict = {
            "id": campo["id"],
            "area": campo["area"],
            "actividad": campo["actividad"],
            "nombre_campo": campo["nombre_campo"],
            "placeholder": campo["placeholder"],
            "es_obligatorio": bool(campo["es_obligatorio"]),
            "orden": campo["orden"],
            "opciones": []
        }

        if campo["tipo"] == "combo":
            for op in opciones_raw:
                if op["campo_id"] == campo["id"]:
                    campo_dict["opciones"].append(op["opcion"])
            combos.append(campo_dict)

        elif campo["tipo"] == "texto":
            textos.append(campo_dict)

        elif campo["tipo"] == "grupo_botones":
            for op in boton_opciones_raw:
                if op["campo_id"] == campo["id"]:
                    campo_dict["opciones"].append({
                        "texto": op["opcion"],
                        "color": op["color"]
                    })
            botones.append(campo_dict)

    return jsonify({
        "success": True,
        "actividades": actividades,
        "campos": {
            "combos": combos,
            "textos": textos,
            "botones": botones
        },
        "total_campos": len(combos) + len(textos) + len(botones)
    })


# ============================================================
# CAMPOS DINÁMICOS (CRUD)
# ============================================================

def obtener_ids_disponibles(conn):
    """Obtiene los IDs disponibles (huecos) en campos_dinamicos."""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM campos_dinamicos ORDER BY id")
    ids_existentes = [row['id'] for row in cursor.fetchall()]

    if not ids_existentes:
        return []

    ids_disponibles = []
    for i in range(len(ids_existentes) - 1):
        if ids_existentes[i + 1] - ids_existentes[i] > 1:
            for hueco in range(ids_existentes[i] + 1, ids_existentes[i + 1]):
                ids_disponibles.append(hueco)

    return ids_disponibles


def obtener_siguiente_id(conn):
    """Obtiene el siguiente ID: reutiliza hueco o usa max+1."""
    cursor = conn.cursor()
    ids_disponibles = obtener_ids_disponibles(conn)

    if ids_disponibles:
        return ids_disponibles[0]

    cursor.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM campos_dinamicos")
    return cursor.fetchone()[0]


@actividades_bp.route("/campos", methods=["POST"])
@requiere_admin
def crear_campo():
    """Crea un campo dinámico (combo, texto o grupo_botones)."""
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    area = data.get("area")
    actividad = data.get("actividad")
    nombre = data.get("nombre_campo")
    tipo = data.get("tipo")
    placeholder = data.get("placeholder", "")

    if not all([area, actividad, nombre, tipo]):
        return jsonify({
            "success": False,
            "error": "Faltan campos requeridos: area, actividad, nombre_campo, tipo"
        }), 400

    if tipo not in ["combo", "texto", "grupo_botones"]:
        return jsonify({
            "success": False,
            "error": "Tipo debe ser: combo, texto o grupo_botones"
        }), 400

    # Obligatorio por defecto para combo y botones, opcional para texto
    if tipo == "texto":
        obligatorio = data.get("es_obligatorio", "0")
    else:
        obligatorio = "1"

    conn = get_db()
    cursor = conn.cursor()

    try:
        nuevo_id = obtener_siguiente_id(conn)

        # Obtener siguiente orden
        cursor.execute("""
            SELECT COALESCE(MAX(orden), 0) + 1 
            FROM campos_dinamicos 
            WHERE area = ? AND actividad = ?
        """, (area, actividad))
        nuevo_orden = cursor.fetchone()[0]

        cursor.execute("""
            INSERT INTO campos_dinamicos 
            (id, area, actividad, nombre_campo, tipo, placeholder, es_obligatorio, orden)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (nuevo_id, area, actividad, nombre, tipo, placeholder, int(obligatorio), nuevo_orden))

        conn.commit()

        tipo_nombre = {
            "combo": "Combo",
            "texto": "Campo de texto",
            "grupo_botones": "Grupo de botones"
        }[tipo]

        return jsonify({
            "success": True,
            "id": nuevo_id,
            "message": f"{tipo_nombre} creado correctamente",
            "campo": {
                "id": nuevo_id,
                "area": area,
                "actividad": actividad,
                "nombre_campo": nombre,
                "tipo": tipo,
                "es_obligatorio": bool(int(obligatorio)),
                "orden": nuevo_orden
            }
        })

    except Exception as e:
        conn.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        conn.close()


@actividades_bp.route("/campos/<int:id>", methods=["DELETE"])
@requiere_admin
def eliminar_campo(id):
    """Elimina un campo dinámico y sus opciones asociadas."""
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Verificar que existe
        cursor.execute("SELECT id, nombre_campo, tipo FROM campos_dinamicos WHERE id = ?", (id,))
        campo = cursor.fetchone()

        if not campo:
            conn.close()
            return jsonify({
                "success": False,
                "error": "Campo no encontrado"
            }), 404

        # Eliminar dependencias y campo
        cursor.execute("DELETE FROM combo_opciones WHERE campo_id = ?", (id,))
        cursor.execute("DELETE FROM boton_opciones WHERE campo_id = ?", (id,))
        cursor.execute("DELETE FROM campos_dinamicos WHERE id = ?", (id,))

        conn.commit()

        return jsonify({
            "success": True,
            "message": f"Campo '{campo['nombre_campo']}' eliminado. ID {id} disponible para reutilización.",
            "id_liberado": id,
            "tipo": campo["tipo"]
        })

    except Exception as e:
        conn.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        conn.close()


# ============================================================
# OPCIONES DE COMBO
# ============================================================

@actividades_bp.route("/combos/opciones", methods=["POST"])
@requiere_admin
def agregar_opcion_combo():
    """Agrega una opción a un campo combo."""
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

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
            "message": f"Opción '{opcion}' agregada al combo",
            "id": cursor.lastrowid
        })

    except Exception as e:
        conn.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        conn.close()


@actividades_bp.route("/combos/opciones", methods=["DELETE"])
@requiere_admin
def eliminar_opcion_combo():
    """Elimina una opción de un combo."""
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

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
            DELETE FROM combo_opciones 
            WHERE campo_id = ? AND opcion = ?
        """, (campo_id, opcion))
        conn.commit()

        return jsonify({
            "success": True,
            "message": f"Opción '{opcion}' eliminada del combo"
        })

    except Exception as e:
        conn.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        conn.close()


# ============================================================
# GRUPOS DE BOTONES
# ============================================================

@actividades_bp.route("/botones", methods=["POST"])
@requiere_admin
def crear_boton():
    """Crea un nuevo grupo de botones."""
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    area = data.get("area")
    actividad = data.get("actividad")
    nombre = data.get("nombre_campo")

    if not all([area, actividad, nombre]):
        return jsonify({
            "success": False,
            "error": "Área, actividad y nombre_campo son requeridos"
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        nuevo_id = obtener_siguiente_id(conn)

        # Obtener siguiente orden
        cursor.execute("""
            SELECT COALESCE(MAX(orden), 0) + 1 
            FROM campos_dinamicos 
            WHERE area = ? AND actividad = ?
        """, (area, actividad))
        nuevo_orden = cursor.fetchone()[0]

        cursor.execute("""
            INSERT INTO campos_dinamicos 
            (id, area, actividad, nombre_campo, tipo, orden, es_obligatorio)
            VALUES (?, ?, ?, ?, 'grupo_botones', ?, 1)
        """, (nuevo_id, area, actividad, nombre, nuevo_orden))

        conn.commit()

        return jsonify({
            "success": True,
            "id": nuevo_id,
            "message": f"Grupo de botones '{nombre}' creado (obligatorio)",
            "campo": {
                "id": nuevo_id,
                "area": area,
                "actividad": actividad,
                "nombre_campo": nombre,
                "tipo": "grupo_botones",
                "es_obligatorio": True,
                "orden": nuevo_orden
            }
        })

    except Exception as e:
        conn.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        conn.close()


@actividades_bp.route("/botones/opciones", methods=["POST"])
@requiere_admin
def agregar_opcion_boton():
    """Agrega una opción a un grupo de botones."""
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

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
        # Verificar límite de 7 opciones
        cursor.execute("""
            SELECT COUNT(*) as total 
            FROM boton_opciones 
            WHERE campo_id = ?
        """, (campo_id,))
        cantidad = cursor.fetchone()["total"]

        if cantidad >= 7:
            return jsonify({
                "success": False,
                "error": "Máximo 7 opciones permitidas por grupo de botones"
            }), 400

        cursor.execute("""
            INSERT INTO boton_opciones (campo_id, opcion, color)
            VALUES (?, ?, ?)
        """, (campo_id, opcion, color))

        conn.commit()

        return jsonify({
            "success": True,
            "message": f"Opción '{opcion}' agregada al grupo de botones",
            "color": color
        })

    except Exception as e:
        conn.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        conn.close()


@actividades_bp.route("/botones/opciones", methods=["DELETE"])
@requiere_admin
def eliminar_opcion_boton():
    """Elimina una opción de un grupo de botones."""
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

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
            DELETE FROM boton_opciones 
            WHERE campo_id = ? AND opcion = ?
        """, (campo_id, opcion))
        conn.commit()

        return jsonify({
            "success": True,
            "message": f"Opción '{opcion}' eliminada del grupo de botones"
        })

    except Exception as e:
        conn.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:
        conn.close()


# ============================================================
# CAMPOS PARA FORMULARIO (Frontend)
# ============================================================

@actividades_bp.route("/campos/formulario", methods=["GET"])
def api_campos_formulario():
    """
    Obtiene los campos dinámicos para renderizar un formulario.
    MÁXIMO 7 campos. Incluye validación de límite.
    """
    actividad = request.args.get("actividad")

    if not actividad:
        return jsonify({
            "success": False,
            "error": "Parámetro 'actividad' requerido"
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, area, actividad, nombre_campo, tipo, placeholder, 
               es_obligatorio, orden
        FROM campos_dinamicos
        WHERE actividad = ?
        ORDER BY orden, id
    """, (actividad,))

    campos = cursor.fetchall()
    conn.close()

    campos_limitados = []
    campos_excedentes = []

    for idx, campo in enumerate(campos):
        campo_dict = {
            "id": campo["id"],
            "nombre": campo["nombre_campo"],
            "tipo": campo["tipo"],
            "placeholder": campo["placeholder"],
            "obligatorio": bool(campo["es_obligatorio"]),
            "orden": campo["orden"],
            "opciones": []
        }

        if idx < 7:
            # Cargar opciones según tipo
            conn = get_db()
            cur = conn.cursor()

            if campo["tipo"] == "combo":
                cur.execute("""
                    SELECT opcion FROM combo_opciones 
                    WHERE campo_id = ?
                """, (campo["id"],))
                campo_dict["opciones"] = [r["opcion"] for r in cur.fetchall()]

            elif campo["tipo"] == "grupo_botones":
                cur.execute("""
                    SELECT opcion, color FROM boton_opciones 
                    WHERE campo_id = ?
                """, (campo["id"],))
                campo_dict["opciones"] = [
                    {"texto": r["opcion"], "color": r["color"]}
                    for r in cur.fetchall()
                ]
                campo_dict["max_seleccion"] = 7

            conn.close()
            campos_limitados.append(campo_dict)

        else:
            campos_excedentes.append({
                "nombre": campo["nombre_campo"],
                "tipo": campo["tipo"],
                "orden": campo["orden"]
            })

    resultado = {
        "success": True,
        "actividad": actividad,
        "campos": campos_limitados,
        "total_configurados": len(campos),
        "mostrados": len(campos_limitados),
        "hay_excedentes": len(campos_excedentes) > 0
    }

    if campos_excedentes:
        nombres = ", ".join([
            f"'{c['nombre']}' ({c['tipo']})" 
            for c in campos_excedentes
        ])
        resultado["advertencia"] = (
            f"⚠️ LÍMITE ALCANZADO: Solo se muestran 7 campos. "
            f"No se cargaron: {nombres}. Elimine campos existentes para mostrar estos."
        )

    return jsonify(resultado)


@actividades_bp.route("/botones/formulario", methods=["GET"])
def api_botones_formulario():
    """Obtiene grupos de botones para una actividad (formulario)."""
    actividad = request.args.get("actividad")

    if not actividad:
        return jsonify({
            "success": False,
            "error": "Parámetro 'actividad' requerido"
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, nombre_campo, orden
        FROM campos_dinamicos
        WHERE actividad = ? AND tipo = 'grupo_botones'
        ORDER BY orden
    """, (actividad,))

    campos = cursor.fetchall()
    resultado = []

    for campo in campos:
        cursor.execute("""
            SELECT opcion, color FROM boton_opciones 
            WHERE campo_id = ? ORDER BY id
        """, (campo["id"],))

        opciones = [
            {"texto": r["opcion"], "color": r["color"]} 
            for r in cursor.fetchall()
        ]

        resultado.append({
            "id": campo["id"],
            "nombre": campo["nombre_campo"],
            "tipo": "grupo_botones",
            "opciones": opciones,
            "max_seleccion": 7,
            "obligatorio": True
        })

    conn.close()

    return jsonify({
        "success": True,
        "actividad": actividad,
        "botones": resultado
    })
