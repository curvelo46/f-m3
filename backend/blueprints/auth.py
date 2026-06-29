from flask import Blueprint, request, session, jsonify
import sqlite3
from config import Config
from database import get_db, set_usuario_sesion, clear_usuario_sesion, verificar_sesion_activa
from utils import requiere_admin, requiere_superadmin, no_cache

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# ============================================================
# AUTENTICACIÓN
# ============================================================

@auth_bp.route("/login", methods=["POST"])
@no_cache
def login():
    """Login de usuario. Acepta JSON o form-data."""
    if request.is_json:
        data = request.get_json()
        email = data.get("usuario") or data.get("email")
        password = data.get("password")
    else:
        email = request.form.get("usuario") or request.form.get("email")
        password = request.form.get("password")

    if not email or not password:
        return jsonify({
            "success": False,
            "error": "Email y contraseña son requeridos"
        }), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM usuarios WHERE email=? AND password=?",
        (email, password)
    )
    user = cursor.fetchone()
    conn.close()

    if user:
        set_usuario_sesion(email, password)
        session["admin"] = user["nombre"]
        session["prioridad"] = user["prioridad"]

        return jsonify({
            "success": True,
            "message": "Login exitoso",
            "user": {
                "id": user["id"],
                "nombre": user["nombre"],
                "email": user["email"],
                "prioridad": user["prioridad"]
            }
        })

    return jsonify({
        "success": False,
        "error": "Usuario o contraseña incorrectos"
    }), 401


@auth_bp.route("/logout", methods=["POST"])
@no_cache
def logout():
    """Cierra la sesión del usuario."""
    clear_usuario_sesion()
    session.clear()

    response = jsonify({
        "success": True,
        "message": "Sesión cerrada correctamente"
    })
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    response.set_cookie('session', '', expires=0)

    return response


@auth_bp.route("/session", methods=["GET"])
def verificar_sesion():
    """Verifica si hay una sesión activa y retorna los datos del usuario."""
    activa = 'admin' in session and session.get('admin') is not None

    if activa:
        return jsonify({
            "success": True,
            "activa": True,
            "user": {
                "nombre": session.get("admin"),
                "prioridad": session.get("prioridad")
            }
        })

    return jsonify({
        "success": True,
        "activa": False,
        "user": None
    })


# ============================================================
# USUARIOS (CRUD)
# ============================================================

@auth_bp.route("/usuarios", methods=["GET"])
@requiere_admin
def listar_usuarios():
    """Lista todos los usuarios (solo superadmin ve todos)."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, nombre, email, prioridad
        FROM usuarios
        ORDER BY prioridad ASC, nombre ASC
    """)
    usuarios = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({
        "success": True,
        "usuarios": usuarios
    })


@auth_bp.route("/usuarios", methods=["POST"])
@requiere_admin
def crear_usuario():
    """Crea un nuevo usuario."""
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    nombre = data.get("nombre", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    if not all([nombre, email, password]):
        return jsonify({
            "success": False,
            "error": "Todos los campos son requeridos"
        }), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO usuarios(nombre, email, password, prioridad)
            VALUES (?, ?, ?, 1)
        """, (nombre, email, password))
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Usuario registrado correctamente",
            "id": cursor.lastrowid
        })

    except sqlite3.IntegrityError:
        return jsonify({
            "success": False,
            "error": "El correo ya existe"
        }), 409

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Error al registrar: {str(e)}"
        }), 500

    finally:
        conn.close()


@auth_bp.route("/usuarios/<int:user_id>", methods=["PUT"])
@requiere_superadmin
def editar_usuario(user_id):
    """Edita un usuario existente."""
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    nombre = data.get("nombre", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT nombre, email, password FROM usuarios WHERE id=?",
        (user_id,)
    )
    usuario_actual = cursor.fetchone()

    if not usuario_actual:
        conn.close()
        return jsonify({
            "success": False,
            "error": "Usuario no encontrado"
        }), 404

    nuevo_nombre = nombre if nombre else usuario_actual["nombre"]
    nuevo_email = email if email else usuario_actual["email"]
    nueva_password = password if password else usuario_actual["password"]

    try:
        cursor.execute("""
            UPDATE usuarios
            SET nombre=?, email=?, password=?
            WHERE id=?
        """, (nuevo_nombre, nuevo_email, nueva_password, user_id))
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Usuario actualizado correctamente"
        })

    except sqlite3.IntegrityError:
        return jsonify({
            "success": False,
            "error": "El correo ya está en uso"
        }), 409

    finally:
        conn.close()


@auth_bp.route("/usuarios/<int:user_id>", methods=["DELETE"])
@requiere_superadmin
def eliminar_usuario(user_id):
    """Elimina un usuario."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM usuarios WHERE id=?", (user_id,))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Usuario eliminado correctamente"
    })


@auth_bp.route("/panel")
@requiere_admin
@no_cache
def panel():
    return render_template("panel.html")

@auth_bp.route("/usuarios")
@requiere_admin
@no_cache
def usuarios():
    return render_template("usuarios.html")


@auth_bp.route("/usuarios/<int:user_id>/prioridad", methods=["PUT"])
@requiere_superadmin
def cambiar_prioridad(user_id):
    """Cambia la prioridad de un usuario."""
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form

    prioridad = data.get("prioridad")

    if prioridad is None:
        return jsonify({
            "success": False,
            "error": "Prioridad requerida"
        }), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE usuarios SET prioridad=? WHERE id=?",
        (prioridad, user_id)
    )
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Prioridad actualizada"
    })


# ============================================================
# ERRORES DEL SISTEMA
# ============================================================

@auth_bp.route("/errores", methods=["GET"])
@requiere_admin
def listar_errores():
    """Obtiene los errores del sistema con paginación."""
    pagina = request.args.get('pagina', 1, type=int)
    por_pagina = request.args.get('por_pagina', 6, type=int)

    conn = get_db()
    cursor = conn.cursor()

    # Contar total
    cursor.execute("SELECT COUNT(*) as total FROM errores_sistema")
    total_errores = cursor.fetchone()['total']
    total_paginas = max(1, (total_errores + por_pagina - 1) // por_pagina)

    if pagina < 1:
        pagina = 1
    if pagina > total_paginas:
        pagina = total_paginas

    offset = (pagina - 1) * por_pagina

    cursor.execute("""
        SELECT id, fecha_hora, modulo, tipo, mensaje, estado 
        FROM errores_sistema 
        ORDER BY fecha_hora DESC 
        LIMIT ? OFFSET ?
    """, (por_pagina, offset))

    errores = []
    for row in cursor.fetchall():
        errores.append({
            'id': row['id'],
            'fecha_y_hora': row['fecha_hora'],
            'modulo': row['modulo'].capitalize() if row['modulo'] else 'Sistema',
            'tipo': row['tipo'],
            'mensaje': row['mensaje'][:60] + '...' if len(row['mensaje']) > 60 else row['mensaje'],
            'estado': row['estado']
        })

    conn.close()

    return jsonify({
        "success": True,
        "errores": errores,
        "pagina_actual": pagina,
        "total_paginas": total_paginas,
        "total_errores": total_errores,
        "por_pagina": por_pagina
    })


# ============================================================
# AUDITORÍA
# ============================================================

@auth_bp.route("/auditoria", methods=["GET"])
@requiere_admin
def listar_auditoria():
    """Obtiene los registros de auditoría."""
    limite = request.args.get('limite', 100, type=int)
    tabla = request.args.get('tabla', '').strip() or None

    conn = get_db()
    cursor = conn.cursor()

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

    datos = []
    for row in cursor.fetchall():
        fila = dict(row)
        fila.pop("id", None)
        datos.append(fila)

    conn.close()

    return jsonify({
        "success": True,
        "auditoria": datos,
        "total": len(datos)
    })


# ============================================================
# PANEL / SECCIONES (Datos para cargar dinámicamente)
# ============================================================

@auth_bp.route("/panel/secciones", methods=["GET"])
@requiere_admin
def obtener_secciones():
    """Retorna las secciones disponibles del panel."""
    secciones = [
        {"id": "uploads", "nombre": "Cargar Datos", "icono": "upload"},
        {"id": "actividades", "nombre": "Actividades", "icono": "list"},
        {"id": "admin_actividades", "nombre": "Admin Actividades", "icono": "settings"},
        {"id": "graficas", "nombre": "Gráficas", "icono": "bar-chart"},
        {"id": "ver_tablas", "nombre": "Ver Tablas", "icono": "table"},
        {"id": "ingresar_usuario", "nombre": "Usuarios", "icono": "users"},
        {"id": "limpieza", "nombre": "Errores", "icono": "alert-circle"}
    ]
    return jsonify({
        "success": True,
        "secciones": secciones
    })