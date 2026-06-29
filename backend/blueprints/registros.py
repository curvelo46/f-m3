from flask import Blueprint, request, jsonify
from datetime import datetime
from database import get_db
from utils import no_cache

registros_bp = Blueprint('registros', __name__, url_prefix='/api/registros')

@registros_bp.route("/", methods=["GET", "POST"])
@no_cache
def index():
    """
    POST: Crea un nuevo registro
    GET: Obtiene todos los registros (con filtros opcionales)
    """
    if request.method == "POST":
        try:
            # Aceptar JSON o form-data
            if request.is_json:
                data = request.get_json()
            else:
                data = request.form

            conn = get_db()
            cursor = conn.cursor()

            # Datos básicos
            cedula = data.get("cedula", "").strip()
            nombre = data.get("nombre", "").strip()
            telefono = data.get("telefono", "").strip()
            vinculo = data.get("vinculo", "").strip()
            area = data.get("area", "").strip()
            dependencia = data.get("dependencia", "").strip()
            actividad_principal = data.get("actividad", "").strip()
            cede = data.get("cedeactual", "").strip()
            semestre = data.get("semestre", "").strip()

            # Leer sub_actividad_1 hasta sub_actividad_7
            sub_actividades = {}
            for i in range(1, 8):
                key = f"sub_actividad_{i}"
                valor = data.get(key, "").strip()
                sub_actividades[key] = valor if valor else None

            # Fecha actual
            fecha = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            accion = "insertar"

            # Insertar registro
            cursor.execute("""
                INSERT INTO registros (
                    cedula, nombre, telefono, vinculo, area, dependencia, 
                    actividad, sub_actividad_1, sub_actividad_2, sub_actividad_3,
                    sub_actividad_4, sub_actividad_5, sub_actividad_6, sub_actividad_7,
                    cede, semestre, fecha
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                cedula,
                nombre,
                telefono,
                vinculo,
                area,
                dependencia,
                actividad_principal,
                sub_actividades["sub_actividad_1"],
                sub_actividades["sub_actividad_2"],
                sub_actividades["sub_actividad_3"],
                sub_actividades["sub_actividad_4"],
                sub_actividades["sub_actividad_5"],
                sub_actividades["sub_actividad_6"],
                sub_actividades["sub_actividad_7"],
                cede,
                semestre,
                fecha
            ))

            nuevo_id = cursor.lastrowid

            # Backup del registro
            cursor.execute("""
                INSERT INTO backup_registros (
                    backup_timestamp, backup_por, cedula, nombre,
                    telefono, vinculo, area, dependencia, actividad, 
                    sub_actividad_1, sub_actividad_2, sub_actividad_3,
                    sub_actividad_4, sub_actividad_5, sub_actividad_6, 
                    sub_actividad_7, cede, semestre, fecha
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                fecha, accion, cedula, nombre, telefono, vinculo, area,
                dependencia, actividad_principal,
                sub_actividades["sub_actividad_1"],
                sub_actividades["sub_actividad_2"],
                sub_actividades["sub_actividad_3"],
                sub_actividades["sub_actividad_4"],
                sub_actividades["sub_actividad_5"],
                sub_actividades["sub_actividad_6"],
                sub_actividades["sub_actividad_7"],
                cede, semestre, fecha
            ))

            conn.commit()
            conn.close()

            return jsonify({
                "success": True,
                "id": nuevo_id,
                "message": "Registro creado exitosamente"
            })

        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"success": False, "message": str(e)}), 500

    # GET: Listar registros con filtros
    try:
        buscar = request.args.get("buscar", "").strip()
        cede = request.args.get("cede", "").strip()
        area = request.args.get("area", "").strip()
        actividad = request.args.get("actividad", "").strip()
        limite = request.args.get("limite", 100, type=int)

        conn = get_db()
        cursor = conn.cursor()

        query = "SELECT * FROM registros WHERE 1=1"
        params = []
        condiciones = []

        if buscar:
            condiciones.append("(cedula LIKE ? OR nombre LIKE ?)")
            params += [f"%{buscar}%"] * 2
        if cede:
            condiciones.append("cede = ?")
            params.append(cede)
        if area:
            condiciones.append("area = ?")
            params.append(area)
        if actividad:
            condiciones.append("actividad = ?")
            params.append(actividad)

        if condiciones:
            query += " AND " + " AND ".join(condiciones)

        query += " ORDER BY id DESC LIMIT ?"
        params.append(limite)

        cursor.execute(query, params)
        registros = [dict(row) for row in cursor.fetchall()]
        conn.close()

        # Limpiar valores None
        for reg in registros:
            for i in range(1, 8):
                key = f"sub_actividad_{i}"
                if key in reg and (reg[key] is None or str(reg[key]).lower() in ["none", "null", ""]):
                    reg[key] = ""
            for campo in ['dependencia', 'semestre', 'telefono', 'cedula', 'nombre']:
                if campo in reg and (reg[campo] is None or reg[campo] == "None"):
                    reg[campo] = ""

        return jsonify({
            "success": True,
            "registros": registros,
            "total": len(registros)
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@registros_bp.route("/buscar_persona", methods=["GET"])
def buscar_persona():
    """
    Busca una persona por cédula en estudiantes o personal_universidad.
    """
    cedula = request.args.get("cedula")
    if not cedula:
        return jsonify({"success": False, "error": "Cédula requerida"}), 400

    conn = get_db()
    cursor = conn.cursor()

    # ESTUDIANTE
    cursor.execute("""
        SELECT nombre, segundo_nombre, apellido, telefono, plan_estudio
        FROM estudiantes
        WHERE numero_identificacion = ?
        LIMIT 1
    """, (cedula,))
    estudiante = cursor.fetchone()

    if estudiante:
        nombre = f"{estudiante['nombre']} {estudiante['segundo_nombre'] or ''} {estudiante['apellido']}"
        conn.close()
        return jsonify({
            "success": True,
            "encontrado": True,
            "nombre": nombre.strip(),
            "telefono": estudiante["telefono"],
            "vinculo": "Estudiante",
            "dependencia": estudiante["plan_estudio"],
            "plan_estudio": estudiante["plan_estudio"],
            "tipo": "estudiante"
        })

    # FUNCIONARIO
    cursor.execute("""
        SELECT 
            numero_personal,
            unidad_organizativa,
            numero_identificacion,
            personnel_no,
            funcion,
            posicion,
            CASE 
                WHEN funcion LIKE '%Profesor%' OR funcion LIKE '%Docente%' THEN 'Docente'
                WHEN funcion LIKE '%Director%' OR funcion LIKE '%Vicerrector%' OR posicion LIKE '%Director%' THEN 'Directivo'
                WHEN funcion LIKE '%Practicante%' THEN 'Practicante'
                ELSE 'Funcionario'
            END as tipo_vinculo
        FROM personal_universidad
        WHERE numero_identificacion = ? OR personnel_no = ?
        LIMIT 1
    """, (cedula, cedula))
    
    personal = cursor.fetchone()
    conn.close()

    if personal:
        return jsonify({
            "success": True,
            "encontrado": True,
            "nombre": personal["numero_personal"],
            "telefono": "",
            "vinculo": personal["tipo_vinculo"],
            "dependencia": personal["unidad_organizativa"],
            "funcion": personal["funcion"],
            "posicion": personal["posicion"],
            "tipo": "funcionario"
        })

    return jsonify({
        "success": True,
        "encontrado": False,
        "message": "Persona no encontrada en la base de datos"
    })