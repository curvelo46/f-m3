from flask import Blueprint, request, send_file, jsonify
import pandas as pd
import io
from database import get_db
from utils import requiere_admin
from config import Config
import qrcode

reportes_bp = Blueprint('reportes', __name__, url_prefix='/api/reportes')

# ============================================================
# QR CODE
# ============================================================

@reportes_bp.route("/qr", methods=["POST"])
@requiere_admin
def generar_qr():
    """Genera un código QR y lo devuelve como imagen PNG"""
    if request.is_json:
        data = request.get_json()
        texto = data.get("texto", "https://example.com")
        size = data.get("tamaño", "200")
    else:
        texto = request.form.get("texto", "https://example.com")
        size = request.form.get("tamaño", "200")

    try:
        box_size = int(size) // 25
        if box_size < 1:
            box_size = 8
    except:
        box_size = 8

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=box_size,
        border=2,
    )
    qr.add_data(texto)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return send_file(
        buffer,
        mimetype="image/png",
        as_attachment=False,
        download_name="qr-code.png"
    )


@reportes_bp.route("/qr/download", methods=["POST"])
@requiere_admin
def descargar_qr():
    """Genera y descarga un QR como archivo"""
    if request.is_json:
        data = request.get_json()
        texto = data.get("texto", "https://example.com")
        size = data.get("tamaño", "200")
    else:
        texto = request.form.get("texto", "https://example.com")
        size = request.form.get("tamaño", "200")

    try:
        box_size = int(size) // 25
        if box_size < 1:
            box_size = 8
    except:
        box_size = 8

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=box_size,
        border=2,
    )
    qr.add_data(texto)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return send_file(
        buffer,
        mimetype="image/png",
        as_attachment=True,
        download_name="codigo-qr.png"
    )


# ============================================================
# VER TABLAS (JSON para React)
# ============================================================

@reportes_bp.route("/tabla/<tabla>", methods=["GET"])
@requiere_admin
def ver_tabla(tabla):
    """Devuelve los datos de cualquier tabla como JSON"""
    tablas_validas = {"estudiantes", "registros", "personal_universidad", "auditoria_sistema"}
    if tabla not in tablas_validas:
        return jsonify({"success": False, "error": "Tabla no válida"}), 400

    buscar = request.args.get("buscar", "").strip()
    cede = request.args.get("cede", "").strip()

    conn = get_db()
    cursor = conn.cursor()

    query = f"SELECT * FROM {tabla}"
    condiciones = []
    valores = []

    if buscar:
        if tabla == "estudiantes":
            condiciones.append("(numero_identificacion LIKE ? OR nombre LIKE ? OR apellido LIKE ?)")
            valores += [f"%{buscar}%"] * 3
        elif tabla == "personal_universidad":
            condiciones.append("(numero_identificacion LIKE ? OR numero_personal LIKE ?)")
            valores += [f"%{buscar}%"] * 2
        elif tabla == "registros":
            condiciones.append("(cedula LIKE ? OR nombre LIKE ?)")
            valores += [f"%{buscar}%"] * 2

    if cede:
        condiciones.append("cede = ?")
        valores.append(cede)

    if condiciones:
        query += " WHERE " + " AND ".join(condiciones)

    campos_por_tabla = {
        "estudiantes": "numero_identificacion",
        "personal_universidad": "numero_identificacion",
        "registros": "rowid",
        "auditoria_sistema": "fecha_hora"
    }
    campo_orden = campos_por_tabla.get(tabla, "rowid")
    query += f" ORDER BY {campo_orden} DESC"

    cursor.execute(query, valores)
    datos = []

    for row in cursor.fetchall():
        fila = dict(row)
        fila.pop("id", None)

        if tabla == "registros":
            for i in range(1, 8):
                key = f"sub_actividad_{i}"
                if key in fila:
                    valor = fila[key]
                    if valor is None or str(valor).lower() in ["none", "null", ""]:
                        fila[key] = ""

            for campo in ['dependencia', 'semestre', 'telefono', 'cedula', 'nombre']:
                if campo in fila and (fila[campo] is None or fila[campo] == "None"):
                    fila[campo] = ""

        fila_renombrada = {}
        for clave, valor in fila.items():
            nuevo_nombre = Config.NOMBRES_VISIBLES.get(clave, clave)
            fila_renombrada[nuevo_nombre] = valor

        datos.append(fila_renombrada)

    conn.close()

    nombres_amigables = {
        "estudiantes": "Estudiantes",
        "registros": "Respuestas",
        "personal_universidad": "Personal Universidad",
        "auditoria_sistema": "Auditoría del Sistema"
    }

    return jsonify({
        "success": True,
        "tabla": tabla,
        "nombre_tabla": nombres_amigables.get(tabla, tabla),
        "datos": datos,
        "total": len(datos)
    })


@reportes_bp.route("/auditoria", methods=["GET"])
@requiere_admin
def ver_auditoria():
    """Endpoint específico para la tabla de auditoría"""
    return ver_tabla("auditoria_sistema")


# ============================================================
# DESCARGAR EXCEL
# ============================================================

@reportes_bp.route("/descargar/<tabla>", methods=["GET"])
@requiere_admin
def descargar_tabla(tabla):
    tablas_validas = {"estudiantes", "personal_universidad", "registros"}
    if tabla not in tablas_validas:
        return jsonify({"success": False, "error": "Tabla no permitida"}), 400

    conn = get_db()
    df = pd.read_sql_query(f"SELECT * FROM {tabla}", conn)
    conn.close()

    nombres = {
        "estudiantes": "Estudiantes",
        "personal_universidad": "Funcionarios",
        "registros": "Respuestas Formulario"
    }

    output = io.BytesIO()
    df.to_excel(output, index=False, engine="openpyxl")
    output.seek(0)

    return send_file(
        output,
        download_name=f"{nombres[tabla]}.xlsx",
        as_attachment=True,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


# ============================================================
# ESTADÍSTICAS GENERALES (Dashboard)
# ============================================================

@reportes_bp.route("/estadisticas", methods=["GET"])
def api_estadisticas():
    """Obtiene estadísticas generales para el dashboard de gráficas."""
    area = request.args.get("area")
    cede = request.args.get("cede")

    conn = get_db()
    cursor = conn.cursor()

    try:
        # --- 1. Totales generales ---
        cursor.execute("SELECT COUNT(*) as total FROM registros")
        total_registros = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) as total FROM estudiantes")
        total_estudiantes = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) as total FROM personal_universidad")
        total_funcionarios = cursor.fetchone()["total"]

        # --- 2. Actividades principales (conteo de registros por actividad) ---
        query_actividades = """
            SELECT 
                COALESCE(actividad, 'Sin actividad') as nombre,
                COUNT(*) as valor
            FROM registros 
            WHERE 1=1
        """
        params_act = []
        if area:
            query_actividades += " AND area = ?"
            params_act.append(area)
        if cede:
            query_actividades += " AND cede = ?"
            params_act.append(cede)

        query_actividades += " GROUP BY actividad ORDER BY valor DESC"

        cursor.execute(query_actividades, params_act)
        actividades_rows = cursor.fetchall()

        actividades_principales = []
        for row in actividades_rows:
            actividades_principales.append({
                "nombre": row["nombre"],
                "valor": row["valor"]
            })

        # --- 3. Sub-actividades (sub_actividad_1 a sub_actividad_7) ---
        sub_actividades = []
        for i in range(1, 8):
            query_sub = f"""
                SELECT 
                    COALESCE(sub_actividad_{i}, '') as nombre,
                    actividad as actividad_padre,
                    COUNT(*) as valor
                FROM registros 
                WHERE sub_actividad_{i} IS NOT NULL 
                  AND sub_actividad_{i} != '' 
                  AND sub_actividad_{i} != 'None'
            """
            params_sub = []
            if area:
                query_sub += f" AND area = ?"
                params_sub.append(area)
            if cede:
                query_sub += f" AND cede = ?"
                params_sub.append(cede)

            query_sub += f" GROUP BY sub_actividad_{i} ORDER BY valor DESC"

            cursor.execute(query_sub, params_sub)
            for row in cursor.fetchall():
                if row["nombre"]:
                    sub_actividades.append({
                        "nombre": row["nombre"],
                        "actividad_padre": row["actividad_padre"],
                        "valor": row["valor"]
                    })

        # Ordenar y limitar sub-actividades
        sub_actividades.sort(key=lambda x: x["valor"], reverse=True)
        sub_actividades = sub_actividades[:15]  # Máximo 15

        # --- 4. Vínculos con la universidad ---
        query_vinculos = """
            SELECT 
                COALESCE(dependencia, 'Externos') as dependencia,
                COALESCE(vinculo, 'Sin vinculo') as vinculo,
                COUNT(*) as total
            FROM registros
            WHERE 1=1
        """
        params_vinc = []
        if area:
            query_vinculos += " AND area = ?"
            params_vinc.append(area)
        if cede:
            query_vinculos += " AND cede = ?"
            params_vinc.append(cede)

        query_vinculos += " GROUP BY dependencia, vinculo ORDER BY total DESC"

        cursor.execute(query_vinculos, params_vinc)
        vinculos_rows = cursor.fetchall()

        vinculos = []
        for row in vinculos_rows:
            vinculos.append({
                "dependencia": row["dependencia"],
                "vinculo": row["vinculo"],
                "total": row["total"]
            })

        # --- 5. Sedes disponibles ---
        cursor.execute("""
            SELECT DISTINCT cede FROM registros 
            WHERE cede IS NOT NULL AND cede != '' 
            ORDER BY cede
        """)
        sedes = [r["cede"] for r in cursor.fetchall()]

        return jsonify({
            "success": True,
            "actividades_principales": actividades_principales,
            "sub_actividades": sub_actividades,
            "vinculos": vinculos,
            "totales": {
                "registros": total_registros,
                "estudiantes": total_estudiantes,
                "funcionarios": total_funcionarios
            },
            "sedes": sedes
        })

    except Exception as e:
        import traceback
        print(f"[ERROR] api_estadisticas: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    finally:
        conn.close()


# ============================================================
# GRÁFICAS / ESTADÍSTICAS (API JSON) - ENDPOINTS ESPECÍFICOS
# ============================================================

@reportes_bp.route("/graficas", methods=["GET"])
def api_graficas():
    """Obtiene datos para gráficas de actividades y sub-actividades."""
    area = request.args.get("area")
    cede = request.args.get("cede")
    actividad_filtro = request.args.get("actividad_filtro")

    conn = get_db()
    cursor = conn.cursor()

    # GRÁFICA 1: Actividades principales
    query_actividades = """
        SELECT actividad, COUNT(*) as total
        FROM registros 
        WHERE 1=1
    """
    params = []

    if area:
        query_actividades += " AND area = ?"
        params.append(area)
    if cede:
        query_actividades += " AND cede = ?"
        params.append(cede)

    query_actividades += " GROUP BY actividad ORDER BY total DESC"

    cursor.execute(query_actividades, params)
    actividades_rows = cursor.fetchall()

    # GRÁFICA 2: Sub-actividades (sub_actividad_1 a sub_actividad_7)
    sub_actividades = []
    for i in range(1, 8):
        query_sub = f"""
            SELECT actividad, sub_actividad_{i} as sub, COUNT(*) as total
            FROM registros 
            WHERE sub_actividad_{i} IS NOT NULL 
              AND sub_actividad_{i} != '' 
              AND sub_actividad_{i} != 'None'
        """
        params_sub = []

        if area:
            query_sub += " AND area = ?"
            params_sub.append(area)
        if actividad_filtro:
            query_sub += " AND actividad = ?"
            params_sub.append(actividad_filtro)
        if cede:
            query_sub += " AND cede = ?"
            params_sub.append(cede)

        query_sub += f" GROUP BY actividad, sub_actividad_{i}"

        cursor.execute(query_sub, params_sub)
        for row in cursor.fetchall():
            if row["sub"]:
                sub_actividades.append({
                    "nombre": row["sub"],
                    "valor": row["total"],
                    "actividad_padre": row["actividad"]
                })

    # Ordenar sub-actividades
    sub_actividades.sort(key=lambda x: x["valor"], reverse=True)

    conn.close()

    # Construir respuesta
    resultado = {
        "success": True,
        "actividades_principales": [
            {"nombre": r["actividad"], "valor": r["total"]} 
            for r in actividades_rows
        ],
        "sub_actividades": sub_actividades
    }

    return jsonify(resultado)


@reportes_bp.route("/vinculos", methods=["GET"])
def api_vinculos():
    """Obtiene datos de vínculos para la tabla."""
    dependencia = request.args.get("dependencia")
    actividad = request.args.get("actividad")
    area = request.args.get("area")
    cede = request.args.get("cede")

    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT 
            COALESCE(dependencia, 'Externos') as dependencia,
            COALESCE(vinculo, 'Sin vinculo') as vinculo,
            COUNT(*) as total 
        FROM registros 
        WHERE 1=1
    """
    params = []

    if area:
        query += " AND area = ?"
        params.append(area)
    if cede:
        query += " AND cede = ?"
        params.append(cede)
    if actividad:
        query += " AND actividad = ?"
        params.append(actividad)
    if dependencia == "externos":
        query += " AND (dependencia IS NULL OR dependencia='' OR dependencia='Externos')"
    elif dependencia:
        query += " AND dependencia = ?"
        params.append(dependencia)

    query += " GROUP BY dependencia, vinculo ORDER BY total DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return jsonify({
        "success": True,
        "datos": [
            {
                "dependencia": r["dependencia"],
                "vinculo": r["vinculo"],
                "total": r["total"]
            }
            for r in rows
        ]
    })


@reportes_bp.route("/dependencias", methods=["GET"])
def api_dependencias():
    """Obtiene lista de dependencias únicas."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT COALESCE(dependencia, 'Externos') as dependencia 
        FROM registros
        WHERE dependencia IS NOT NULL AND dependencia != ''
        ORDER BY dependencia
    """)
    deps = [r["dependencia"] for r in cursor.fetchall()]
    conn.close()
    return jsonify({"success": True, "dependencias": deps})


@reportes_bp.route("/sedes", methods=["GET"])
def api_sedes():
    """Obtiene lista de sedes (cede) únicas."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT DISTINCT cede FROM registros
        WHERE cede IS NOT NULL AND cede != ''
        ORDER BY cede
    """)
    sedes = [r["cede"] for r in cursor.fetchall()]
    conn.close()
    return jsonify({"success": True, "sedes": sedes})


@reportes_bp.route("/textos", methods=["GET"])
def api_textos():
    """Obtiene estadísticas de campos de texto para graficar"""
    area = request.args.get("area")
    actividad = request.args.get("actividad")
    cede = request.args.get("cede")

    conn = get_db()
    cursor = conn.cursor()

    query_campos = "SELECT id, nombre_campo, actividad FROM textos_dinamicos WHERE 1=1"
    params = []

    if area:
        query_campos += " AND area = ?"
        params.append(area)
    if actividad:
        query_campos += " AND actividad = ?"
        params.append(actividad)

    cursor.execute(query_campos, params)
    campos = cursor.fetchall()

    resultado = []

    for campo in campos:
        query_valores = f"""
            SELECT 
                actividad,
                ? as nombre_campo,
                texto_{campo['id']} as valor,
                COUNT(*) as total
            FROM registros 
            WHERE texto_{campo['id']} IS NOT NULL 
              AND texto_{campo['id']} != '' 
              AND texto_{campo['id']} != 'None'
        """
        params_val = [campo["nombre_campo"]]

        if area:
            query_valores += " AND area = ?"
            params_val.append(area)
        if cede:
            query_valores += " AND cede = ?"
            params_val.append(cede)

        query_valores += f" GROUP BY texto_{campo['id']} ORDER BY total DESC"

        cursor.execute(query_valores, params_val)
        valores = cursor.fetchall()

        for v in valores:
            resultado.append({
                "nombre": f"{v['actividad']} > {v['nombre_campo']}: {v['valor']}",
                "valor": v["total"],
                "tipo": "texto",
                "actividad_padre": v["actividad"],
                "campo": v["nombre_campo"],
                "respuesta": v["valor"]
            })

    conn.close()
    return jsonify({"success": True, "datos": resultado})
